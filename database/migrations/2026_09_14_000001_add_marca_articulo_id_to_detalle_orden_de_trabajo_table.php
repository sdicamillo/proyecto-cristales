<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('detalle_orden_de_trabajo', function (Blueprint $table) {
            $table->foreignId('marca_articulo_id')
                ->nullable()
                ->after('articulo_id')
                ->constrained('marcas_articulos')
                ->cascadeOnUpdate()
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('detalle_orden_de_trabajo', function (Blueprint $table) {
            $table->dropForeign(['marca_articulo_id']);
            $table->dropColumn('marca_articulo_id');
        });
    }
};
