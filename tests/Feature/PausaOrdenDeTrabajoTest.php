<?php

use App\Models\Estado;
use App\Models\OrdenDeTrabajo;
use App\Models\OrdenDeTrabajoHistorialEstado;
use App\Models\Role;
use App\Models\Titular;
use App\Models\TitularVehiculo;
use App\Models\User;
use App\Models\Vehiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    foreach ([
        1 => 'Administrador',
        2 => 'Cajero',
        3 => 'Taller',
        4 => 'Consulta',
    ] as $id => $descripcion) {
        $rol = new Role(['descripcion' => $descripcion]);
        $rol->role_id = $id;
        $rol->save();
    }

    foreach ([
        Estado::NOMBRE_INICIADO,
        Estado::NOMBRE_EN_TALLER,
        Estado::NOMBRE_FINALIZADA,
        Estado::NOMBRE_RETIRADA,
        Estado::NOMBRE_ANULADA,
    ] as $nombre) {
        Estado::firstOrCreate(['nombre' => $nombre]);
    }

    $titular = Titular::factory()->create();
    $vehiculo = Vehiculo::create([
        'patente' => 'PAU123',
        'anio' => 2024,
    ]);

    $this->titularVehiculo = TitularVehiculo::create([
        'titular_id' => $titular->id,
        'vehiculo_id' => $vehiculo->id,
    ]);
});

function usuarioPausa(int $roleId): User
{
    return User::create([
        'name' => "Usuario {$roleId}",
        'password' => bcrypt('password'),
        'role_id' => $roleId,
    ]);
}

function ordenPausa(string $estadoNombre = Estado::NOMBRE_INICIADO): OrdenDeTrabajo
{
    static $secuencia = 1;

    return OrdenDeTrabajo::create([
        'titular_vehiculo_id' => test()->titularVehiculo->id,
        'estado_id' => Estado::where('nombre', $estadoNombre)->firstOrFail()->id,
        'fecha' => '2026-10-05 10:00:00',
        'fecha_entrega_estimada' => '2026-10-10 10:00:00',
        'con_factura' => false,
        'numero_orden' => 'PAUSA-'.$secuencia++,
        'observacion' => 'Orden activa',
    ]);
}

it('permite pausar y reanudar a todos los roles con gestión de órdenes', function (int $roleId) {
    $usuario = usuarioPausa($roleId);
    $orden = ordenPausa(Estado::NOMBRE_EN_TALLER);
    $estadoAnteriorId = $orden->estado_id;

    $this->actingAs($usuario)
        ->patch(route('ordenes.pausar', $orden), ['motivo' => 'Esperando repuesto'])
        ->assertSessionHasNoErrors();

    $orden->refresh();
    expect($orden->estado->nombre)->toBe(Estado::NOMBRE_PAUSADA)
        ->and($orden->estado_previo_pausa_id)->toBe($estadoAnteriorId);

    $this->patch(route('ordenes.reanudar', $orden))
        ->assertSessionHasNoErrors();

    $orden->refresh();
    expect($orden->estado_id)->toBe($estadoAnteriorId)
        ->and($orden->estado_previo_pausa_id)->toBeNull();
})->with([
    'administrador' => 1,
    'cajero' => 2,
    'taller' => 3,
]);

it('normaliza el motivo opcional y registra usuario, pausa y reanudación en el historial', function () {
    $usuario = usuarioPausa(1);
    $orden = ordenPausa();

    $this->actingAs($usuario)
        ->patch(route('ordenes.pausar', $orden), ['motivo' => '  Falta confirmar con el cliente.  '])
        ->assertSessionHasNoErrors();

    $pausa = OrdenDeTrabajoHistorialEstado::where('orden_de_trabajo_id', $orden->id)
        ->whereHas('estado', fn ($query) => $query->where('nombre', Estado::NOMBRE_PAUSADA))
        ->firstOrFail();

    expect($pausa->motivo)->toBe('Falta confirmar con el cliente.')
        ->and($pausa->user_id)->toBe($usuario->id);

    $this->patch(route('ordenes.reanudar', $orden))->assertSessionHasNoErrors();

    $ultimo = OrdenDeTrabajoHistorialEstado::where('orden_de_trabajo_id', $orden->id)
        ->orderByDesc('id')
        ->firstOrFail();

    expect($ultimo->estado->nombre)->toBe(Estado::NOMBRE_INICIADO)
        ->and($ultimo->user_id)->toBe($usuario->id)
        ->and($ultimo->motivo)->toBeNull();
});

it('permite omitir el motivo de pausa', function () {
    $orden = ordenPausa();

    $this->actingAs(usuarioPausa(2))
        ->patch(route('ordenes.pausar', $orden), ['motivo' => '   '])
        ->assertSessionHasNoErrors();

    expect(OrdenDeTrabajoHistorialEstado::latest('id')->firstOrFail()->motivo)->toBeNull();
});

it('rechaza la pausa para estados finales', function (string $estado) {
    $orden = ordenPausa($estado);

    $this->actingAs(usuarioPausa(1))
        ->patch(route('ordenes.pausar', $orden))
        ->assertSessionHasErrors('estado');

    expect($orden->fresh()->estado->nombre)->toBe($estado);
})->with([
    Estado::NOMBRE_FINALIZADA,
    Estado::NOMBRE_RETIRADA,
    Estado::NOMBRE_ANULADA,
]);

it('rechaza pausas y reanudaciones repetidas', function () {
    $orden = ordenPausa();
    $this->actingAs(usuarioPausa(1));

    $this->patch(route('ordenes.reanudar', $orden))->assertSessionHasErrors('estado');
    $this->patch(route('ordenes.pausar', $orden))->assertSessionHasNoErrors();
    $this->patch(route('ordenes.pausar', $orden))->assertSessionHasErrors('estado');
    $this->patch(route('ordenes.reanudar', $orden))->assertSessionHasNoErrors();
    $this->patch(route('ordenes.reanudar', $orden))->assertSessionHasErrors('estado');
});

it('rechaza usuarios sin la capacidad de gestionar órdenes', function () {
    $orden = ordenPausa();

    $this->actingAs(usuarioPausa(4))
        ->patch(route('ordenes.pausar', $orden))
        ->assertForbidden();

    expect($orden->fresh()->estado->nombre)->toBe(Estado::NOMBRE_INICIADO);
});

it('mantiene una orden pausada en solo lectura', function () {
    $orden = ordenPausa();
    $admin = usuarioPausa(1);

    $this->actingAs($admin)
        ->patch(route('ordenes.pausar', $orden))
        ->assertSessionHasNoErrors();

    $this->get(route('ordenes.edit', $orden))
        ->assertRedirect(route('ordenes.show', $orden));

    $this->put(route('ordenes.update', $orden), ['observacion' => 'Intento de cambio'])
        ->assertSessionHasErrors('error');

    $this->delete(route('ordenes.destroy', $orden), ['motivo' => 'Intento de anulación válido.'])
        ->assertSessionHasErrors('error');

    expect($orden->fresh()->observacion)->toBe('Orden activa')
        ->and($orden->fresh()->estado->nombre)->toBe(Estado::NOMBRE_PAUSADA);
});

it('impide que taller cambie normalmente el estado de una orden pausada', function () {
    $orden = ordenPausa();
    $taller = usuarioPausa(3);

    $this->actingAs($taller)
        ->patch(route('ordenes.pausar', $orden))
        ->assertSessionHasNoErrors();

    $this->patch(route('taller.ordenes.estado', $orden), [
        'estado_id' => Estado::where('nombre', Estado::NOMBRE_EN_TALLER)->firstOrFail()->id,
    ])->assertSessionHasErrors('estado_id');

    expect($orden->fresh()->estado->nombre)->toBe(Estado::NOMBRE_PAUSADA);
});

it('muestra y permite filtrar órdenes pausadas en ambas grillas', function () {
    $orden = ordenPausa();
    $admin = usuarioPausa(1);

    $this->actingAs($admin)
        ->patch(route('ordenes.pausar', $orden))
        ->assertSessionHasNoErrors();

    $estadoPausadaId = Estado::idPausada();

    $this->get(route('ordenes.index', ['estado_id' => $estadoPausadaId]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('ordenes/index', false)
            ->has('ordenes.data', 1)
            ->where('ordenes.data.0.id', $orden->id)
            ->where('ordenes.data.0.estado.nombre', Estado::NOMBRE_PAUSADA));

    $this->actingAs(usuarioPausa(3))
        ->get(route('taller.ots', ['estado_id' => $estadoPausadaId]))
        ->assertInertia(fn (Assert $page) => $page
            ->component('taller/ordenes', false)
            ->has('ots', 1)
            ->where('ots.0.id', $orden->id)
            ->where('ots.0.estado.nombre', Estado::NOMBRE_PAUSADA)
            ->has('estadosCambio', 2));
});
