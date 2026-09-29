<?php

namespace App\Http\Controllers\Administrador;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;

class UserController extends Controller
{

    // Listo los usuarios
    public function index()
    {
        return Inertia::render('Administrador/usuarios', [
            'users' => User::with('role')->orderBy('name')->get(),
            'roles' => Role::orderBy('descripcion')->get(),
            'flash' => session('success'),
        ]);
    }

    // Alta de usuario
    public function store(Request $request)
    {
        $request->validate([
            'name'     => 'required|string|max:255|unique:users,name',
            'password' => 'required|string|min:6',
            'role_id'  => 'required|exists:rol,role_id', 
        ]);

        User::create([
            'name'     => $request->name,
            'password' => Hash::make($request->password),
            'role_id'  => $request->role_id,
        ]);

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'Usuario creado con éxito.');
    }

    // Actualizo un usuario existente
    public function update(Request $request, User $user)
    {
         $request->validate([
            'name'     => 'required|string|max:255|unique:users,name,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role_id'  => 'required|exists:rol,role_id', // 👈 validación correcta
        ]);

        $data = [
            'name'    => $request->name,
            'role_id' => $request->role_id,
        ];

        if ($request->filled('password')) {
            $data['password'] = Hash::make($request->password);
        }

        $user->update($data);

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'Usuario actualizado con éxito.');
    }

    // Elimino un usuario
    public function destroy(User $user)
    {
        $user->delete();

        return redirect()
            ->route('admin.users.index')
            ->with('success', 'Usuario eliminado con éxito.');
    }
}
