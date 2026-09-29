<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Motivo del cambio de estado.
     *
     * Vive en el historial y no en la orden para que cualquier transicion
     * pueda documentarse, no solo la anulacion. Es nullable porque los
     * cambios de estado existentes no tienen motivo y porque la mayoria
     * de las transiciones no lo requieren.
     */
    public function up(): void
    {
        Schema::table('orden_de_trabajo_historial_estados', function (Blueprint $table) {
            $table->text('motivo')->nullable()->after('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('orden_de_trabajo_historial_estados', function (Blueprint $table) {
            $table->dropColumn('motivo');
        });
    }
};
