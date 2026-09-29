<?php

use App\Models\Articulo;
use App\Models\Estado;
use App\Models\Marca;
use App\Models\MedioDePago;
use App\Models\Modelo;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\User;
use App\Models\Vehiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    // El id se fija a mano: el rol 3 es el de taller y el controlador le niega el acceso
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
    $this->medioDePago = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->articulo = Articulo::create(['nombre' => 'Parabrisas', 'activo' => true]);
    $this->titular = Titular::factory()->create();
});

/**
 * Arma el payload de una OT nueva, sobrescribiendo el vehículo con lo que reciba.
 */
function payloadOrden(array $nuevoVehiculo): array
{
    return [
        'tipo_documento' => 'OT',
        'con_factura' => false,
        'es_garantia' => false,
        'estado_id' => test()->estado->id,
        'fecha' => '2026-07-27 10:00',
        'fecha_entrega_estimada' => '2026-07-28 10:00',
        'titular_id' => test()->titular->id,
        'vehiculo_id' => null,
        'nuevo_vehiculo' => $nuevoVehiculo,
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
            'fecha' => '2026-07-27',
            'pagado' => false,
            'observacion' => null,
        ]],
    ];
}

it('crea la orden dando de alta una marca y un modelo que no existían', function () {
    $this->actingAs($this->usuario);

    $response = $this->post('/ordenes', payloadOrden([
        'patente' => 'ab123cd',
        'marca_id' => null,
        'marca_nueva' => 'Chery',
        'modelo_id' => null,
        'modelo_nuevo' => 'Tiggo 4',
        'anio' => 2024,
    ]));

    $response->assertRedirect(route('ordenes.index'));
    $response->assertSessionHasNoErrors();

    $marca = Marca::where('nombre', 'Chery')->first();
    expect($marca)->not->toBeNull();

    $modelo = Modelo::where('nombre', 'Tiggo 4')->first();
    expect($modelo)->not->toBeNull()
        ->and($modelo->marca_id)->toBe($marca->id);

    $vehiculo = Vehiculo::where('patente', 'AB123CD')->first();
    expect($vehiculo)->not->toBeNull()
        ->and($vehiculo->marca_id)->toBe($marca->id)
        ->and($vehiculo->modelo_id)->toBe($modelo->id)
        ->and($vehiculo->anio)->toBe(2024);

    $orden = OrdenDeTrabajo::with('titularVehiculo')->first();
    expect($orden->titularVehiculo->vehiculo_id)->toBe($vehiculo->id)
        ->and($orden->titularVehiculo->titular_id)->toBe($this->titular->id);
});

it('permite un modelo nuevo sobre una marca ya existente', function () {
    $this->actingAs($this->usuario);
    $marca = Marca::create(['nombre' => 'Fiat']);

    $response = $this->post('/ordenes', payloadOrden([
        'patente' => 'AA999ZZ',
        'marca_id' => $marca->id,
        'marca_nueva' => null,
        'modelo_id' => null,
        'modelo_nuevo' => 'Fastback',
        'anio' => 2025,
    ]));

    $response->assertSessionHasNoErrors();

    expect(Marca::count())->toBe(1);

    $vehiculo = Vehiculo::where('patente', 'AA999ZZ')->firstOrFail();
    expect($vehiculo->modelo->nombre)->toBe('Fastback')
        ->and($vehiculo->modelo->marca_id)->toBe($marca->id);
});

it('reutiliza la marca y el modelo del catálogo en lugar de duplicarlos', function () {
    $this->actingAs($this->usuario);
    $marca = Marca::create(['nombre' => 'Toyota']);
    $modelo = Modelo::create(['marca_id' => $marca->id, 'nombre' => 'Corolla']);

    $response = $this->post('/ordenes', payloadOrden([
        'patente' => 'AB555CD',
        'marca_id' => null,
        'marca_nueva' => 'Toyota',
        'modelo_id' => null,
        'modelo_nuevo' => 'Corolla',
        'anio' => 2023,
    ]));

    $response->assertSessionHasNoErrors();

    expect(Marca::count())->toBe(1)
        ->and(Modelo::count())->toBe(1);

    $vehiculo = Vehiculo::where('patente', 'AB555CD')->firstOrFail();
    expect($vehiculo->marca_id)->toBe($marca->id)
        ->and($vehiculo->modelo_id)->toBe($modelo->id);
});

it('deja la marca, el modelo y el vehículo disponibles en los ABM', function () {
    $this->actingAs($this->usuario);

    $this->post('/ordenes', payloadOrden([
        'patente' => 'AD777FF',
        'marca_id' => null,
        'marca_nueva' => 'BYD',
        'modelo_id' => null,
        'modelo_nuevo' => 'Dolphin',
        'anio' => 2026,
    ]))->assertSessionHasNoErrors();

    $marca = Marca::where('nombre', 'BYD')->firstOrFail();

    // ABM Catálogo de vehículos: el modelo nuevo queda listado bajo su marca
    $this->get('/catalogo-vehiculos')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('CatalogoVehiculos/Index')
            ->where('modelos.data.0.nombre', 'Dolphin')
            ->where('modelos.data.0.marca.nombre', 'BYD'));

    // Los desplegables de futuras OTs ya ofrecen la marca y el modelo
    $this->getJson('/api/marcas')->assertOk()->assertJsonFragment(['nombre' => 'BYD']);
    $this->getJson("/api/modelos/{$marca->id}")->assertOk()->assertJsonFragment(['nombre' => 'Dolphin']);

    // ABM Clientes: el vehículo queda asociado al titular de la orden
    $this->get('/clientes')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Clientes/Index')
            ->where('clientes.data.0.vehiculos.0.patente', 'AD777FF')
            ->where('clientes.data.0.vehiculos.0.marca.nombre', 'BYD')
            ->where('clientes.data.0.vehiculos.0.modelo.nombre', 'Dolphin'));
});

it('rechaza el vehículo nuevo si no llega marca ni modelo', function () {
    $this->actingAs($this->usuario);

    $response = $this->post('/ordenes', payloadOrden([
        'patente' => 'AC111DD',
        'marca_id' => null,
        'marca_nueva' => null,
        'modelo_id' => null,
        'modelo_nuevo' => null,
        'anio' => 2024,
    ]));

    $response->assertSessionHasErrors(['nuevo_vehiculo.marca_id', 'nuevo_vehiculo.modelo_id']);
    expect(OrdenDeTrabajo::count())->toBe(0)
        ->and(Vehiculo::count())->toBe(0);
});
