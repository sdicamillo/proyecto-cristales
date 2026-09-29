<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('orden_de_trabajo', function (Blueprint $table) {
            $table->foreignId('asignado_a_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completado_por_id')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orden_de_trabajo', function (Blueprint $table) {
            $table->dropConstrainedForeignId('completado_por_id');
            $table->dropConstrainedForeignId('asignado_a_id');
        });
    }
};
