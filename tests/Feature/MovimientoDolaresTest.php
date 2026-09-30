<?php

use App\Models\MedioDePago;
use App\Models\Movimiento;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();
    $this->actingAs(User::create(['name' => 'Administrativo', 'password' => bcrypt('password'), 'role_id' => 1]));
    $this->efectivo = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->dolares = MedioDePago::create(['nombre' => 'Efectivo en dólares', 'moneda' => MedioDePago::MONEDA_USD]);
    DB::table('concepto')->updateOrInsert(['id' => 3], ['nombre' => 'Cobro a clientes', 'tipo' => 'ingreso']);
    $this->payload = [
        'fecha' => '2026-09-30 10:00',
        'monto' => 1, // se ignora en USD: el servidor lo recalcula
        'monto_usd' => 50,
        'tipo_cambio' => 1400,
        'concepto_id' => 3,
        'medio_de_pago_id' => $this->dolares->id,
    ];
});

it('registra un ingreso manual en dólares con su equivalente en pesos', function () {
    $this->post('/ingresos', $this->payload)->assertRedirect()->assertSessionHasNoErrors();

    $movimiento = Movimiento::firstOrFail();
    expect($movimiento->monto)->toBe(70000.0)
        ->and($movimiento->monto_usd)->toBe(50.0)
        ->and($movimiento->tipo_cambio)->toBe(1400.0);
});

it('exige monto en USD y tipo de cambio si el medio es en dólares', function () {
    unset($this->payload['monto_usd'], $this->payload['tipo_cambio']);

    $this->post('/ingresos', $this->payload)->assertSessionHasErrors(['monto_usd', 'tipo_cambio']);
    expect(Movimiento::count())->toBe(0);
});

it('limpia los datos en USD si el medio es en pesos', function () {
    $this->payload['medio_de_pago_id'] = $this->efectivo->id;
    $this->payload['monto'] = 1234;

    $this->post('/ingresos', $this->payload)->assertRedirect()->assertSessionHasNoErrors();

    $movimiento = Movimiento::firstOrFail();
    expect($movimiento->monto)->toBe(1234.0)
        ->and($movimiento->monto_usd)->toBeNull()
        ->and($movimiento->tipo_cambio)->toBeNull();
});

it('al editar un ingreso recalcula el monto en pesos', function () {
    $this->post('/ingresos', $this->payload)->assertRedirect();
    $movimiento = Movimiento::firstOrFail();

    $this->put('/ingresos/'.$movimiento->id, array_replace($this->payload, ['tipo_cambio' => 1500]))
        ->assertRedirect()->assertSessionHasNoErrors();

    expect($movimiento->fresh()->monto)->toBe(75000.0);
});

it('agrupa por medio de pago con el total en USD', function () {
    $this->post('/ingresos', $this->payload)->assertRedirect();
    $this->post('/ingresos', array_replace($this->payload, ['medio_de_pago_id' => $this->efectivo->id, 'monto' => 1000]))->assertRedirect();

    $filas = Movimiento::groupedByMedioPago('2026-09-30', Movimiento::TIPO_INGRESO)->keyBy('medio_de_pago_id');

    expect($filas[$this->dolares->id]->total_usd)->toBe(50.0)
        ->and($filas[$this->dolares->id]->moneda)->toBe('USD')
        ->and($filas[$this->dolares->id]->total)->toBe(0.0)
        ->and($filas[$this->dolares->id]->porcentaje)->toBeNull()
        ->and($filas[$this->efectivo->id]->total_usd)->toBeNull()
        ->and($filas[$this->efectivo->id]->porcentaje)->toBe(100.0)
        ->and(Movimiento::totalsUsdForDate('2026-09-30'))->toBe(['ingresos' => 50.0, 'egresos' => 0.0]);
});

it('los totales en pesos no incluyen los movimientos en dólares', function () {
    $this->post('/ingresos', $this->payload)->assertRedirect();
    $this->post('/ingresos', array_replace($this->payload, ['medio_de_pago_id' => $this->efectivo->id, 'monto' => 1000]))->assertRedirect();

    expect(Movimiento::totalsForDate('2026-09-30'))->toBe(['ingresos' => 1000.0, 'egresos' => 0.0])
        ->and(Movimiento::totalsUsdForDate('2026-09-30'))->toBe(['ingresos' => 50.0, 'egresos' => 0.0]);
});

it('solo dólares: el resumen del día muestra $0 en pesos y el total en USD aparte', function () {
    $this->post('/ingresos', array_replace($this->payload, ['fecha' => now()->format('Y-m-d H:i')]))->assertRedirect();

    $this->get('/resumen-del-dia')->assertInertia(fn ($page) => $page
        ->where('kpis.ingresos', 0)
        ->where('kpisUsd.ingresos', 50));
});
