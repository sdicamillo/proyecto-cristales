<?php

use App\Models\Articulo;
use App\Models\Estado;
use App\Models\MedioDePago;
use App\Models\OrdenDeTrabajo;
use App\Models\OrdenDeTrabajoHistorialEstado;
use App\Models\Role;
use App\Models\Titular;
use App\Models\User;
use App\Models\Vehiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    // El id se fija a mano: el rol 3 es el de taller y el controlador le niega anular
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();

    // La tabla users no tiene email (lo elimina una migración), por eso no se usa el factory
    $this->usuario = User::create([
        'name' => 'Tester',
        'password' => bcrypt('password'),
        'role_id' => $rol->role_id,
    ]);

    $this->estado = Estado::create(['nombre' => 'Iniciado']);
    // "Anulada" ya lo siembra la migración add_estado_anulada_and_concepto_anulacion_ot
    $this->estadoAnulada = Estado::where('nombre', 'Anulada')->firstOrFail();
    $this->medioDePago = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->articulo = Articulo::create(['nombre' => 'Parabrisas', 'activo' => true]);
    $this->titular = Titular::factory()->create();

    $this->actingAs($this->usuario);
});

/**
 * Crea una OT pasando por el endpoint real y devuelve el modelo resultante.
 * El pago queda sin registrar para que la anulación no dependa del concepto
 * "Anulación OT" ni de los movimientos de reversa.
 */
function ordenParaAnular(): OrdenDeTrabajo
{
    test()->post('/ordenes', [
        'tipo_documento' => 'OT',
        'con_factura' => false,
        'es_garantia' => false,
        'estado_id' => test()->estado->id,
        'fecha' => '2026-09-29 10:00',
        'fecha_entrega_estimada' => '2026-09-30 10:00',
        'titular_id' => test()->titular->id,
        'vehiculo_id' => null,
        'nuevo_vehiculo' => [
            'patente' => 'AB123CD',
            'marca_id' => null,
            'marca_nueva' => 'Chery',
            'modelo_id' => null,
            'modelo_nuevo' => 'Tiggo 4',
            'anio' => 2024,
        ],
        'detalles' => [[
            'articulo_id' => test()->articulo->id,
            'descripcion' => 'Parabrisas delantero',
            'valor' => 1000,
            'cantidad' => 1,
            'colocacion_incluida' => true,
            'atributos' => [],
        ]],
        'pagos' => [[
            'medio_de_pago_id' => test()->medioDePago->id,
            'monto' => 1000,
            'fecha' => '2026-09-29',
            'pagado' => false,
            'observacion' => null,
        ]],
    ])->assertSessionHasNoErrors();

    return OrdenDeTrabajo::firstOrFail();
}

it('anula la orden y guarda el motivo en el historial de estados', function () {
    $orden = ordenParaAnular();

    $response = $this->delete("/ordenes/{$orden->id}", [
        'motivo' => 'El cliente canceló el trabajo por presupuesto.',
    ]);

    $response->assertRedirect(route('ordenes.index'));
    $response->assertSessionHasNoErrors();

    expect($orden->fresh()->estado_id)->toBe($this->estadoAnulada->id);

    $historial = OrdenDeTrabajoHistorialEstado::where('orden_de_trabajo_id', $orden->id)
        ->where('estado_id', $this->estadoAnulada->id)
        ->firstOrFail();

    expect($historial->motivo)->toBe('El cliente canceló el trabajo por presupuesto.')
        ->and($historial->user_id)->toBe($this->usuario->id);
});

it('rechaza la anulación si no se envía un motivo', function () {
    $orden = ordenParaAnular();

    $this->delete("/ordenes/{$orden->id}", [])
        ->assertSessionHasErrors('motivo');

    expect($orden->fresh()->estado_id)->toBe($this->estado->id)
        ->and(OrdenDeTrabajoHistorialEstado::where('estado_id', $this->estadoAnulada->id)->count())->toBe(0);
});

it('rechaza un motivo más corto que el mínimo', function () {
    $orden = ordenParaAnular();

    $this->delete("/ordenes/{$orden->id}", ['motivo' => 'no'])
        ->assertSessionHasErrors('motivo');

    expect($orden->fresh()->estado_id)->toBe($this->estado->id);
});

it('rechaza un motivo más largo que el máximo', function () {
    $orden = ordenParaAnular();

    $this->delete("/ordenes/{$orden->id}", ['motivo' => str_repeat('a', 501)])
        ->assertSessionHasErrors('motivo');

    expect($orden->fresh()->estado_id)->toBe($this->estado->id);
});

it('recorta los espacios sobrantes del motivo', function () {
    $orden = ordenParaAnular();

    $this->delete("/ordenes/{$orden->id}", [
        'motivo' => '   Duplicada por error de carga.   ',
    ])->assertSessionHasNoErrors();

    $historial = OrdenDeTrabajoHistorialEstado::where('estado_id', $this->estadoAnulada->id)->firstOrFail();

    expect($historial->motivo)->toBe('Duplicada por error de carga.');
});

it('no permite anular dos veces la misma orden', function () {
    $orden = ordenParaAnular();

    $this->delete("/ordenes/{$orden->id}", ['motivo' => 'Primera anulación válida.'])
        ->assertSessionHasNoErrors();

    $this->delete("/ordenes/{$orden->id}", ['motivo' => 'Segunda anulación válida.'])
        ->assertSessionHasErrors('error');

    expect(OrdenDeTrabajoHistorialEstado::where('estado_id', $this->estadoAnulada->id)->count())->toBe(1);
});

it('le sigue negando la anulación al rol taller', function () {
    $orden = ordenParaAnular();

    $rolTaller = new Role(['descripcion' => 'Taller']);
    $rolTaller->role_id = 3;
    $rolTaller->save();

    $userTaller = User::create([
        'name' => 'Taller',
        'password' => bcrypt('password'),
        'role_id' => 3,
    ]);

    $this->actingAs($userTaller)
        ->delete("/ordenes/{$orden->id}", ['motivo' => 'Intento desde taller.'])
        ->assertForbidden();

    expect($orden->fresh()->estado_id)->toBe($this->estado->id);
});
