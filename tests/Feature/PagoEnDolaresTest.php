<?php

use App\Models\Articulo;
use App\Models\Estado;
use App\Models\MedioDePago;
use App\Models\Movimiento;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\User;

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();
    $actor = User::create(['name' => 'Administrativo', 'password' => bcrypt('password'), 'role_id' => 1]);
    $this->iniciado = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_INICIADO]);
    $titular = Titular::factory()->create();
    $articulo = Articulo::create(['nombre' => 'Parabrisas', 'activo' => true]);
    $this->efectivo = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->dolares = MedioDePago::create(['nombre' => 'Efectivo en dólares', 'moneda' => MedioDePago::MONEDA_USD]);
    $this->payload = [
        'tipo_documento' => 'OT', 'con_factura' => false, 'es_garantia' => false,
        'estado_id' => $this->iniciado->id,
        'fecha' => '2026-09-30 10:00', 'fecha_entrega_estimada' => '2026-10-01 10:00',
        'titular_id' => $titular->id,
        'nuevo_vehiculo' => ['patente' => 'AB123CD', 'marca_nueva' => 'Marca', 'modelo_nuevo' => 'Modelo'],
        'detalles' => [['articulo_id' => $articulo->id, 'valor' => 150000, 'cantidad' => 1, 'atributos' => []]],
        'pagos' => [[
            'medio_de_pago_id' => $this->dolares->id,
            'monto' => 1, // se ignora: el servidor lo recalcula
            'monto_usd' => 100,
            'tipo_cambio' => 1500,
            'fecha' => '2026-09-30',
            'pagado' => true,
        ]],
    ];
    Illuminate\Support\Facades\DB::table('concepto')->updateOrInsert(['id' => 3], ['nombre' => 'Cobro a clientes', 'tipo' => 'ingreso']);
    $this->actingAs($actor);
});

it('guarda el monto en USD, el tipo de cambio y el equivalente en pesos', function () {
    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();

    $pago = OrdenDeTrabajo::firstOrFail()->pagos()->firstOrFail();
    expect((float) $pago->monto_usd)->toBe(100.0)
        ->and((float) $pago->tipo_cambio)->toBe(1500.0)
        ->and((float) $pago->valor)->toBe(150000.0);

    $movimiento = Movimiento::firstOrFail();
    expect($movimiento->monto)->toBe(150000.0)
        ->and($movimiento->monto_usd)->toBe(100.0)
        ->and($movimiento->tipo_cambio)->toBe(1500.0)
        ->and($movimiento->medio_de_pago_id)->toBe($this->dolares->id);
});

it('al anular la OT el egreso de reversa conserva los datos en USD', function () {
    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();
    $orden = OrdenDeTrabajo::firstOrFail();

    $this->delete('/ordenes/'.$orden->id, ['motivo' => 'Cliente desistió'])
        ->assertRedirect()->assertSessionHasNoErrors();

    $egreso = Movimiento::where('tipo', Movimiento::TIPO_EGRESO)->firstOrFail();
    expect($egreso->monto)->toBe(150000.0)
        ->and($egreso->monto_usd)->toBe(100.0)
        ->and($egreso->tipo_cambio)->toBe(1500.0);
});

it('un ajuste negativo en USD genera un egreso con el monto en USD positivo', function () {
    $this->payload['pagos'][0]['monto_usd'] = -10;
    Illuminate\Support\Facades\DB::table('concepto')->updateOrInsert(['id' => 7], ['nombre' => 'Ajuste de cobro', 'tipo' => 'egreso']);

    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();

    $egreso = Movimiento::where('tipo', Movimiento::TIPO_EGRESO)->firstOrFail();
    expect($egreso->monto)->toBe(15000.0)
        ->and($egreso->monto_usd)->toBe(10.0);
});

it('exige monto en USD y tipo de cambio para pagos en dólares', function () {
    unset($this->payload['pagos'][0]['monto_usd'], $this->payload['pagos'][0]['tipo_cambio']);

    $this->post('/ordenes', $this->payload)
        ->assertSessionHasErrors(['pagos.0.monto_usd', 'pagos.0.tipo_cambio']);
    expect(OrdenDeTrabajo::count())->toBe(0);
});

it('rechaza un tipo de cambio no positivo', function () {
    $this->payload['pagos'][0]['tipo_cambio'] = 0;

    $this->post('/ordenes', $this->payload)->assertSessionHasErrors('pagos.0.tipo_cambio');
});

it('descarta datos en USD en pagos en pesos', function () {
    $this->payload['pagos'][0]['medio_de_pago_id'] = $this->efectivo->id;
    $this->payload['pagos'][0]['monto'] = 150000;

    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();

    $pago = OrdenDeTrabajo::firstOrFail()->pagos()->firstOrFail();
    expect($pago->monto_usd)->toBeNull()
        ->and($pago->tipo_cambio)->toBeNull()
        ->and((float) $pago->valor)->toBe(150000.0);
});
