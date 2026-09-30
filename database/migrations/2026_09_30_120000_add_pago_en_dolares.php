<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Moneda en la que se recibe el medio de pago (ARS por defecto)
        Schema::table('medio_de_pago', function (Blueprint $table) {
            $table->string('moneda', 3)->default('ARS')->after('nombre');
        });

        // En pagos en USD, "valor" guarda el equivalente en pesos
        Schema::table('precio', function (Blueprint $table) {
            $table->decimal('monto_usd', 12, 2)->nullable()->after('valor');
            $table->decimal('tipo_cambio', 12, 2)->nullable()->after('monto_usd');
        });

        // En instalaciones nuevas lo crea DatosInicialesSeeder
        if (! DB::table('medio_de_pago')->exists()) {
            return;
        }

        $existente = DB::table('medio_de_pago')->where('nombre', 'Efectivo en dólares')->first();

        if ($existente) {
            DB::table('medio_de_pago')->where('id', $existente->id)->update(['moneda' => 'USD']);
        } else {
            DB::table('medio_de_pago')->insert([
                'nombre' => 'Efectivo en dólares',
                'moneda' => 'USD',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('precio', function (Blueprint $table) {
            $table->dropColumn(['monto_usd', 'tipo_cambio']);
        });

        Schema::table('medio_de_pago', function (Blueprint $table) {
            $table->dropColumn('moneda');
        });
    }
};
