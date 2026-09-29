<?php

use App\Models\Articulo;
use App\Models\Estado;
use App\Models\MedioDePago;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\User;
use Inertia\Testing\AssertableInertia;

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();
    $this->actor = User::create(['name' => 'Administrativo', 'password' => bcrypt('password'), 'role_id' => 1]);
    $this->asignado = User::create(['name' => 'Juan', 'password' => bcrypt('password'), 'role_id' => 1]);
    $this->realizador = User::create(['name' => 'Pedro', 'password' => bcrypt('password'), 'role_id' => 1]);
    $this->iniciado = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_INICIADO]);
    $this->finalizada = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_FINALIZADA]);
    $this->retirada = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_RETIRADA]);
    $titular = Titular::factory()->create();
    $articulo = Articulo::create(['nombre' => 'Parabrisas', 'activo' => true]);
    $medio = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->payload = [
        'tipo_documento' => 'OT', 'con_factura' => false, 'es_garantia' => false,
        'estado_id' => $this->iniciado->id,
        'asignado_a_id' => $this->asignado->id, 'completado_por_id' => null,
        'fecha' => '2026-09-29 10:00', 'fecha_entrega_estimada' => '2026-09-30 10:00',
        'titular_id' => $titular->id,
        'nuevo_vehiculo' => ['patente' => 'AB123CD', 'marca_nueva' => 'Marca', 'modelo_nuevo' => 'Modelo'],
        'detalles' => [['articulo_id' => $articulo->id, 'valor' => 1000, 'cantidad' => 1, 'atributos' => []]],
        'pagos' => [['medio_de_pago_id' => $medio->id, 'monto' => 1000, 'fecha' => '2026-09-29', 'pagado' => false]],
    ];
    Illuminate\Support\Facades\DB::table('concepto')->updateOrInsert(['id' => 3], ['nombre' => 'Cobro a clientes', 'tipo' => 'ingreso']);
    $this->actingAs($this->actor);
});

it('conserva el asignado y registra al realizador elegido, no al usuario que cierra', function () {
    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();
    $orden = OrdenDeTrabajo::firstOrFail();
    expect($orden->completado_por_id)->toBeNull();
    $payload = array_replace($this->payload, [
        'estado_id' => $this->finalizada->id,
        'completado_por_id' => $this->realizador->id,
        'vehiculo_id' => $orden->titularVehiculo->vehiculo_id,
        'nuevo_vehiculo' => null,
    ]);
    $payload['pagos'][0]['pagado'] = true;
    $this->put('/ordenes/'.$orden->id, $payload)->assertRedirect()->assertSessionHasNoErrors();
    $orden->refresh();
    expect($orden->asignado_a_id)->toBe($this->asignado->id)
        ->and($orden->completado_por_id)->toBe($this->realizador->id);
    $this->get('/ordenes/'.$orden->id)->assertInertia(fn (AssertableInertia $page) => $page
        ->component('ordenes/show')->where('orden.asignado_a.name', 'Juan')->where('orden.completado_por.name', 'Pedro'));
    $payload['estado_id'] = $this->retirada->id;
    $payload['pagos'][0]['id'] = $orden->pagos()->firstOrFail()->id;
    $this->put('/ordenes/'.$orden->id, $payload)->assertRedirect()->assertSessionHasNoErrors();
    expect($orden->fresh()->completado_por_id)->toBe($this->realizador->id);
});

it('exige el realizador al crear una orden finalizada o retirada', function (string $estado) {
    $this->payload['estado_id'] = $this->{$estado}->id;
    $this->post('/ordenes', $this->payload)->assertSessionHasErrors('completado_por_id');
    expect(OrdenDeTrabajo::count())->toBe(0);
})->with(['finalizada', 'retirada']);

it('no permite finalizar una orden existente sin indicar quién la completó', function () {
    $this->post('/ordenes', $this->payload)->assertRedirect()->assertSessionHasNoErrors();
    $orden = OrdenDeTrabajo::firstOrFail();
    $this->payload['estado_id'] = $this->finalizada->id;
    $this->payload['vehiculo_id'] = $orden->titularVehiculo->vehiculo_id;
    $this->payload['nuevo_vehiculo'] = null;
    $this->put('/ordenes/'.$orden->id, $this->payload)->assertSessionHasErrors('completado_por_id');
    expect($orden->fresh()->estado_id)->toBe($this->iniciado->id);
});

it('rechaza personas inexistentes', function () {
    $this->payload['asignado_a_id'] = 999999;
    $this->payload['completado_por_id'] = 999999;
    $this->post('/ordenes', $this->payload)->assertSessionHasErrors(['asignado_a_id', 'completado_por_id']);
});
