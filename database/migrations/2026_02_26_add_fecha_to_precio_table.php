<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('precio', function (Blueprint $table) {
            // Agregar campo fecha para registrar cuándo se realizó cada pago
            $table->date('fecha')->after('valor')->nullable();
        });

        // Opcional: Poblar las fechas existentes con la fecha de la orden
        // Si ya tenés registros sin fecha, esto los actualiza
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('
                UPDATE precio
                SET fecha = (
                    SELECT DATE(o.fecha)
                    FROM orden_de_trabajo o
                    WHERE o.id = precio.orden_de_trabajo_id
                )
                WHERE fecha IS NULL
            ');
        } else {
            DB::statement('
                UPDATE precio p
                INNER JOIN orden_de_trabajo o ON p.orden_de_trabajo_id = o.id
                SET p.fecha = DATE(o.fecha)
                WHERE p.fecha IS NULL
            ');
        }

        // Hacer el campo NOT NULL después de poblar
        Schema::table('precio', function (Blueprint $table) {
            $table->date('fecha')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('precio', function (Blueprint $table) {
            $table->dropColumn('fecha');
        });
    }
};
