<?php

use App\Models\Articulo;
use App\Models\Categoria;
use App\Models\Estado;
use App\Models\MedioDePago;
use App\Models\OrdenDeTrabajo;
use App\Models\Role;
use App\Models\Titular;
use App\Models\User;

beforeEach(function () {
    $rol = new Role(['descripcion' => 'Administrador']);
    $rol->role_id = 1;
    $rol->save();

    $this->usuarioOrdenAgente = User::create([
        'name' => 'Administrador de órdenes',
        'password' => 'password',
        'role_id' => 1,
    ]);
    $this->iniciadoOrdenAgente = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_INICIADO]);
    $this->finalizadaOrdenAgente = Estado::firstOrCreate(['nombre' => Estado::NOMBRE_FINALIZADA]);
    $this->titularOrdenAgente = Titular::factory()->create();
    $this->articuloOrdenAgente = Articulo::create(['nombre' => 'Parabrisas agente', 'activo' => true]);
    $this->medioOrdenAgente = MedioDePago::create(['nombre' => 'Efectivo']);

    $this->actingAs($this->usuarioOrdenAgente);
});

function payloadOrdenParaAgente(string $patente, bool $conFactura = false, array $cambios = []): array
{
    $base = [
        'tipo_documento' => $conFactura ? 'FC' : 'OT',
        'con_factura' => $conFactura,
        'es_garantia' => false,
        'estado_id' => test()->iniciadoOrdenAgente->id,
        'fecha' => '2026-10-05 10:00',
        'fecha_entrega_estimada' => '2026-10-06 10:00',
        'titular_id' => test()->titularOrdenAgente->id,
        'nuevo_vehiculo' => [
            'patente' => $patente,
            'marca_nueva' => 'Marca agente',
            'modelo_nuevo' => 'Modelo agente',
            'anio' => 2026,
        ],
        'detalles' => [[
            'articulo_id' => test()->articuloOrdenAgente->id,
            'descripcion' => 'Trabajo validado por agente',
            'valor' => 10000,
            'cantidad' => 1,
            'colocacion_incluida' => true,
            'atributos' => [],
        ]],
        'pagos' => [[
            'medio_de_pago_id' => test()->medioOrdenAgente->id,
            'monto' => 10000,
            'fecha' => '2026-10-05',
            'pagado' => false,
        ]],
    ];

    return array_replace_recursive($base, $cambios);
}

it('genera correlativos independientes y portables para OT y factura', function () {
    $this->post(route('ordenes.store'), payloadOrdenParaAgente('AA111AA'))
        ->assertRedirect(route('ordenes.index'))
        ->assertSessionHasNoErrors();
    $this->post(route('ordenes.store'), payloadOrdenParaAgente('BB222BB', true))
        ->assertRedirect(route('ordenes.index'))
        ->assertSessionHasNoErrors();
    $this->post(route('ordenes.store'), payloadOrdenParaAgente('CC333CC'))
        ->assertRedirect(route('ordenes.index'))
        ->assertSessionHasNoErrors();

    expect(OrdenDeTrabajo::orderBy('id')->pluck('numero_orden')->all())
        ->toBe(['OT-000001', 'FC-000001', 'OT-000002']);
});

it('rechaza fechas incoherentes y no deja datos parciales', function () {
    $payload = payloadOrdenParaAgente('DD444DD', false, [
        'fecha_entrega_estimada' => '2026-10-04 10:00',
    ]);

    $this->post(route('ordenes.store'), $payload)
        ->assertSessionHasErrors('fecha_entrega_estimada');

    expect(OrdenDeTrabajo::count())->toBe(0);
    $this->assertDatabaseMissing('vehiculo', ['patente' => 'DD444DD']);
});

it('rechaza órdenes de importe total cero sin persistir cabecera ni vehículo', function () {
    $payload = payloadOrdenParaAgente('EE555EE');
    $payload['detalles'][0]['valor'] = 0;

    $this->post(route('ordenes.store'), $payload)
        ->assertSessionHasErrors('detalles');

    expect(OrdenDeTrabajo::count())->toBe(0);
    $this->assertDatabaseMissing('vehiculo', ['patente' => 'EE555EE']);
});

it('exige atributos obligatorios antes de crear la orden', function () {
    $categoria = Categoria::create([
        'articulo_id' => $this->articuloOrdenAgente->id,
        'nombre' => 'Lado',
        'obligatoria' => true,
        'activo' => true,
    ]);

    $this->post(route('ordenes.store'), payloadOrdenParaAgente('FF666FF'))
        ->assertSessionHasErrors("detalles.0.atributos.{$categoria->id}")
        ->assertSessionHas('error');

    expect(OrdenDeTrabajo::count())->toBe(0);
});

it('no permite crear una orden finalizada si no está totalmente pagada', function () {
    $payload = payloadOrdenParaAgente('GG777GG');
    $payload['estado_id'] = $this->finalizadaOrdenAgente->id;
    $payload['completado_por_id'] = $this->usuarioOrdenAgente->id;

    $this->post(route('ordenes.store'), $payload)
        ->assertSessionHasErrors('estado_id');

    expect(OrdenDeTrabajo::count())->toBe(0);
});
