<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatosInicialesSeeder extends Seeder
{
    public function run(): void
    {
        // ---- Tabla rol ----
        DB::table('rol')->insert([
            ['role_id' => 1, 'descripcion' => 'Administrador'],
            ['role_id' => 2, 'descripcion' => 'Cajero'],
            ['role_id' => 3, 'descripcion' => 'Taller'],
        ]);

        // ---- Tabla users ----
        DB::table('users')->insert([
            [
                'name' => 'Admin',
                'password' => Hash::make('admin123'), // contraseña encriptada
                'role_id' => 1, // Administrador
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Cajero',
                'password' => Hash::make('editor123'),
                'role_id' => 2, // Cajero
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Taller',
                'password' => Hash::make('user123'),
                'role_id' => 3, // Taller
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // ---- Tabla medio_de_pago ----
        DB::table('medio_de_pago')->insert([
            ['nombre' => 'Efectivo', 'moneda' => 'ARS'],
            ['nombre' => 'Crédito', 'moneda' => 'ARS'],
            ['nombre' => 'Débito', 'moneda' => 'ARS'],
            ['nombre' => 'Transferencia', 'moneda' => 'ARS'],
            ['nombre' => 'Cheque', 'moneda' => 'ARS'],
            ['nombre' => 'Voucher de Compañía de Seguros', 'moneda' => 'ARS'],
            ['nombre' => 'Efectivo en dólares', 'moneda' => 'USD'],
        ]);

        // ---- Tabla estado ----
        DB::table('estado')->insert([
            ['nombre' => 'Iniciado'],
            ['nombre' => 'En taller'],
            ['nombre' => 'Finalizada - Para Retirar'],
            ['nombre' => 'Retirada'],
        ]);
    }
}
