<?php

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    foreach ([
        1 => 'Administrador',
        2 => 'Cajero',
        3 => 'Taller',
    ] as $id => $descripcion) {
        $rol = new Role(['descripcion' => $descripcion]);
        $rol->role_id = $id;
        $rol->save();
    }
});

function usuarioParaPruebasDeAgente(int $roleId, ?string $name = null): User
{
    return User::create([
        'name' => $name ?? "Agente rol {$roleId}",
        'password' => 'password',
        'role_id' => $roleId,
    ]);
}

it('redirige al login cuando se intenta acceder a pantallas protegidas', function (string $url) {
    $this->get($url)->assertRedirect(route('login'));
})->with([
    'órdenes' => '/ordenes',
    'clientes' => '/clientes',
    'usuarios' => '/admin/users',
    'métricas' => '/admin/metrics',
    'resumen diario' => '/resumen-del-dia',
]);

it('autentica por nombre y envía cada rol a su circuito de trabajo', function (int $roleId, string $destino) {
    $usuario = usuarioParaPruebasDeAgente($roleId);

    $this->post(route('login.store'), [
        'name' => $usuario->name,
        'password' => 'password',
    ])->assertRedirect($destino);

    $this->assertAuthenticatedAs($usuario);
})->with([
    'administrador' => [1, '/ordenes'],
    'cajero' => [2, '/ordenes'],
    'taller' => [3, '/taller/ots'],
]);

it('rechaza credenciales incorrectas sin autenticar al usuario', function () {
    $usuario = usuarioParaPruebasDeAgente(1);

    $this->post(route('login.store'), [
        'name' => $usuario->name,
        'password' => 'incorrecta',
    ])->assertSessionHasErrors('name');

    $this->assertGuest();
});

it('aplica las capacidades del cajero sobre módulos sensibles', function () {
    $this->actingAs(usuarioParaPruebasDeAgente(2));

    $this->get('/ordenes')->assertOk();
    $this->get('/clientes')->assertOk();
    $this->get('/admin/users')->assertForbidden();
    $this->get('/admin/metrics')->assertForbidden();
    $this->get('/resumen-del-dia')->assertForbidden();
    $this->get('/ingresos')->assertForbidden();
});

it('limita al taller a su circuito y redirige el listado general', function () {
    $this->actingAs(usuarioParaPruebasDeAgente(3));

    $this->get('/ordenes')->assertRedirect(route('taller.ots'));
    $this->get('/taller/ots')->assertOk();
    $this->get('/clientes')->assertForbidden();
    $this->get('/admin/users')->assertForbidden();
    $this->get('/resumen-del-dia')->assertForbidden();
});

it('permite al administrador crear actualizar y eliminar usuarios', function () {
    $this->actingAs(usuarioParaPruebasDeAgente(1, 'Administrador de prueba'));

    $this->post(route('admin.users.store'), [
        'name' => 'Operador nuevo',
        'password' => 'secreto123',
        'role_id' => 2,
    ])->assertRedirect(route('admin.users.index'))->assertSessionHasNoErrors();

    $operador = User::where('name', 'Operador nuevo')->firstOrFail();
    expect($operador->role_id)->toBe(2)
        ->and(Hash::check('secreto123', $operador->password))->toBeTrue();

    $hashOriginal = $operador->password;
    $this->put(route('admin.users.update', $operador), [
        'name' => 'Operador actualizado',
        'password' => '',
        'role_id' => 3,
    ])->assertRedirect(route('admin.users.index'))->assertSessionHasNoErrors();

    $operador->refresh();
    expect($operador->name)->toBe('Operador actualizado')
        ->and($operador->role_id)->toBe(3)
        ->and($operador->password)->toBe($hashOriginal);

    $this->delete(route('admin.users.destroy', $operador))
        ->assertRedirect(route('admin.users.index'));

    $this->assertDatabaseMissing('users', ['id' => $operador->id]);
});

it('valida duplicados contraseña y rol al crear usuarios', function () {
    $this->actingAs(usuarioParaPruebasDeAgente(1, 'Nombre existente'));

    $this->post(route('admin.users.store'), [
        'name' => 'Nombre existente',
        'password' => '123',
        'role_id' => 999,
    ])->assertSessionHasErrors(['name', 'password', 'role_id']);

    expect(User::where('name', 'Nombre existente')->count())->toBe(1);
});

it('impide al cajero administrar usuarios incluso con un payload válido', function () {
    $this->actingAs(usuarioParaPruebasDeAgente(2));

    $this->post(route('admin.users.store'), [
        'name' => 'No autorizado',
        'password' => 'secreto123',
        'role_id' => 2,
    ])->assertForbidden();

    $this->assertDatabaseMissing('users', ['name' => 'No autorizado']);
});
