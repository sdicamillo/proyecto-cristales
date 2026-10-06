<?php

use App\Models\Estado;
use App\Models\Marca;
use App\Models\Modelo;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\TitularVehiculo;
use App\Models\User;
use App\Models\Vehiculo;

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();

    $this->actingAs(User::create([
        'name' => 'Administrador de catálogos',
        'password' => 'password',
        'role_id' => 1,
    ]));
});

it('crea marcas y modelos y evita duplicados dentro de una marca', function () {
    $this->post(route('catalogo-vehiculos.store'), [
        'marca_nueva' => '  Toyota  ',
        'modelo' => '  Corolla  ',
    ])->assertSessionHasNoErrors();

    $marca = Marca::where('nombre', 'Toyota')->firstOrFail();
    $modelo = Modelo::where('nombre', 'Corolla')->firstOrFail();
    expect($modelo->marca_id)->toBe($marca->id);

    $this->post(route('catalogo-vehiculos.store'), [
        'marca_id' => $marca->id,
        'modelo' => 'Corolla',
    ])->assertSessionHasErrors('modelo');

    expect(Modelo::count())->toBe(1);
});

it('crea un cliente con vehículo y lo expone en las APIs relacionadas', function () {
    $marca = Marca::create(['nombre' => 'Ford']);
    $modelo = Modelo::create(['marca_id' => $marca->id, 'nombre' => 'Ranger']);

    $this->post(route('clientes.store'), [
        'nombre' => 'Ana',
        'apellido' => 'Pérez',
        'telefono' => '1122334455',
        'email' => 'ana@example.com',
    ])->assertSessionHasNoErrors();

    $cliente = Titular::where('email', 'ana@example.com')->firstOrFail();

    $this->post(route('clientes.create-vehicle', $cliente), [
        'patente' => 'AB123CD',
        'marca_id' => $marca->id,
        'modelo_id' => $modelo->id,
        'anio' => 2025,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $vehiculo = Vehiculo::where('patente', 'AB123CD')->firstOrFail();
    $this->assertDatabaseHas('titular_vehiculo', [
        'titular_id' => $cliente->id,
        'vehiculo_id' => $vehiculo->id,
    ]);

    $this->getJson(route('api.clientes.modelos', $marca->id))
        ->assertOk()
        ->assertJsonFragment(['id' => $modelo->id, 'nombre' => 'Ranger']);

    $this->getJson(route('api.clientes.vehiculos-disponibles', $cliente))
        ->assertOk()
        ->assertJsonMissing(['id' => $vehiculo->id]);
});

it('elimina el vehículo huérfano al desasociarlo de su único titular', function () {
    $cliente = Titular::factory()->create();
    $vehiculo = Vehiculo::create(['patente' => 'ABC123', 'anio' => 2020]);
    TitularVehiculo::create(['titular_id' => $cliente->id, 'vehiculo_id' => $vehiculo->id]);

    $this->delete(route('clientes.detach-vehicle', [$cliente, $vehiculo]))
        ->assertSessionHas('success', 'Vehículo eliminado (no tenía otros dueños).');

    $this->assertDatabaseMissing('vehiculo', ['id' => $vehiculo->id]);
    $this->assertDatabaseMissing('titular_vehiculo', [
        'titular_id' => $cliente->id,
        'vehiculo_id' => $vehiculo->id,
    ]);
});

it('protege cliente vehículo y modelo cuando ya participan de una orden', function () {
    $cliente = Titular::factory()->create();
    $marca = Marca::create(['nombre' => 'Renault']);
    $modelo = Modelo::create(['marca_id' => $marca->id, 'nombre' => 'Kangoo']);
    $vehiculo = Vehiculo::create([
        'patente' => 'AC456DE',
        'marca_id' => $marca->id,
        'modelo_id' => $modelo->id,
        'anio' => 2022,
    ]);
    $pivot = TitularVehiculo::create(['titular_id' => $cliente->id, 'vehiculo_id' => $vehiculo->id]);
    $estado = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_INICIADO]);
    OrdenDeTrabajo::create([
        'titular_vehiculo_id' => $pivot->id,
        'estado_id' => $estado->id,
        'fecha' => '2026-10-05 10:00:00',
        'fecha_entrega_estimada' => '2026-10-06 10:00:00',
        'numero_orden' => 'OT-009999',
        'con_factura' => false,
    ]);

    $this->delete(route('clientes.detach-vehicle', [$cliente, $vehiculo]))
        ->assertSessionHas('error');
    $this->delete(route('clientes.destroy', $cliente))
        ->assertSessionHas('error');
    $this->delete(route('vehiculos.destroy', $vehiculo))
        ->assertSessionHas('error');
    $this->delete(route('catalogo-vehiculos.destroy', $modelo))
        ->assertSessionHas('error');

    $this->assertDatabaseHas('titular', ['id' => $cliente->id]);
    $this->assertDatabaseHas('vehiculo', ['id' => $vehiculo->id]);
    $this->assertDatabaseHas('modelos', ['id' => $modelo->id]);
    $this->assertDatabaseHas('titular_vehiculo', ['id' => $pivot->id]);
});
