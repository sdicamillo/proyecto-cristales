<?php

use App\Models\Articulo;
use App\Models\Estado;
use App\Models\Marca;
use App\Models\MedioDePago;
use App\Models\Modelo;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\TitularVehiculo;
use App\Models\User;
use App\Models\Vehiculo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;

uses(RefreshDatabase::class);

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();

    $this->usuario = User::create([
        'name' => 'Admin Tester',
        'password' => bcrypt('password'),
        'role_id' => $rol->role_id,
    ]);

    $this->estado = Estado::create(['nombre' => 'Iniciado']);
    $this->medioDePago = MedioDePago::create(['nombre' => 'Efectivo']);
    $this->articulo = Articulo::create(['nombre' => 'Parabrisas', 'activo' => true]);
    $this->titular = Titular::factory()->create();
});

it('permite crear una marca y un modelo desde la API y se visualiza en catalogo de vehiculos', function () {
    $this->actingAs($this->usuario);

    // 1. Crear marca
    $responseMarca = $this->postJson('/api/marcas', [
        'nombre' => 'Alfa Romeo',
    ]);

    $responseMarca->assertStatus(201)
        ->assertJsonPath('nombre', 'Alfa Romeo');

    $marcaId = $responseMarca->json('id');
    expect($marcaId)->not->toBeNull();
    $this->assertDatabaseHas('marcas', ['nombre' => 'Alfa Romeo']);

    // 2. Crear modelo para la marca
    $responseModelo = $this->postJson('/api/modelos', [
        'nombre' => 'Giulia',
        'marca_id' => $marcaId,
    ]);

    $responseModelo->assertStatus(201)
        ->assertJsonPath('nombre', 'Giulia')
        ->assertJsonPath('marca_id', $marcaId);

    $this->assertDatabaseHas('modelos', [
        'nombre' => 'Giulia',
        'marca_id' => $marcaId,
    ]);

    // 3. Verificar que aparece en el catálogo de vehículos
    $responseCatalogo = $this->get('/catalogo-vehiculos');
    $responseCatalogo->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('CatalogoVehiculos/Index')
            ->has('modelos', fn (AssertableInertia $modelos) => $modelos
                ->where('data.0.nombre', 'Giulia')
                ->where('data.0.marca.nombre', 'Alfa Romeo')
                ->etc()
            )
        );
});

it('crea una orden de trabajo con factura y guarda el numero de factura', function () {
    $this->actingAs($this->usuario);

    $marca = Marca::create(['nombre' => 'Toyota']);
    $modelo = Modelo::create(['nombre' => 'Corolla', 'marca_id' => $marca->id]);
    $vehiculo = Vehiculo::create([
        'patente' => 'AF123CD',
        'marca_id' => $marca->id,
        'modelo_id' => $modelo->id,
        'anio' => 2023,
    ]);

    $payload = [
        'tipo_documento' => 'FC',
        'con_factura' => true,
        'numero_factura' => 'FC-A0001-00009999',
        'es_garantia' => false,
        'estado_id' => $this->estado->id,
        'fecha' => '2026-10-09 10:00',
        'fecha_entrega_estimada' => '2026-10-10 10:00',
        'titular_id' => $this->titular->id,
        'vehiculo_id' => $vehiculo->id,
        'detalles' => [[
            'articulo_id' => $this->articulo->id,
            'descripcion' => 'Luneta térmica',
            'valor' => 50000,
            'cantidad' => 1,
            'colocacion_incluida' => true,
            'atributos' => [],
        ]],
        'pagos' => [[
            'medio_de_pago_id' => $this->medioDePago->id,
            'monto' => 50000,
            'fecha' => '2026-10-09',
            'pagado' => true,
            'observacion' => null,
        ]],
    ];

    $response = $this->post('/ordenes', $payload);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('orden_de_trabajo', [
        'con_factura' => true,
        'numero_factura' => 'FC-A0001-00009999',
    ]);

    $orden = OrdenDeTrabajo::latest('id')->first();
    expect($orden->con_factura)->toBeTrue()
        ->and($orden->numero_factura)->toBe('FC-A0001-00009999');

    // Comprobar que en show se entrega la información
    $responseShow = $this->get("/ordenes/{$orden->id}");
    $responseShow->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('ordenes/show')
            ->where('orden.con_factura', true)
            ->where('orden.numero_factura', 'FC-A0001-00009999')
        );
});

it('actualiza el numero de factura al editar la orden de trabajo', function () {
    $this->actingAs($this->usuario);

    $marca = Marca::create(['nombre' => 'Honda']);
    $modelo = Modelo::create(['nombre' => 'Civic', 'marca_id' => $marca->id]);
    $vehiculo = Vehiculo::create([
        'patente' => 'AG456ZZ',
        'marca_id' => $marca->id,
        'modelo_id' => $modelo->id,
        'anio' => 2024,
    ]);

    $titularVehiculo = TitularVehiculo::create([
        'titular_id' => $this->titular->id,
        'vehiculo_id' => $vehiculo->id,
    ]);

    $orden = OrdenDeTrabajo::create([
        'tipo_documento' => 'OT',
        'con_factura' => false,
        'numero_factura' => null,
        'es_garantia' => false,
        'estado_id' => $this->estado->id,
        'fecha' => '2026-10-09 10:00:00',
        'titular_vehiculo_id' => $titularVehiculo->id,
    ]);

    // Editar para activar factura con su número
    $updatePayload = [
        'fecha' => '2026-10-09 10:00',
        'estado_id' => $this->estado->id,
        'con_factura' => true,
        'numero_factura' => 'FC-B0002-12345678',
        'es_garantia' => false,
        'titular_id' => $this->titular->id,
        'vehiculo_id' => $vehiculo->id,
        'detalles' => [[
            'articulo_id' => $this->articulo->id,
            'descripcion' => 'Parabrisas delantero',
            'valor' => 30000,
            'cantidad' => 1,
            'colocacion_incluida' => true,
            'atributos' => [],
        ]],
        'pagos' => [[
            'medio_de_pago_id' => $this->medioDePago->id,
            'monto' => 30000,
            'fecha' => '2026-10-09',
            'pagado' => true,
            'observacion' => null,
        ]],
    ];

    $response = $this->put("/ordenes/{$orden->id}", $updatePayload);
    $response->assertSessionHasNoErrors();

    $orden->refresh();
    expect($orden->con_factura)->toBeTrue()
        ->and($orden->numero_factura)->toBe('FC-B0002-12345678');
});
