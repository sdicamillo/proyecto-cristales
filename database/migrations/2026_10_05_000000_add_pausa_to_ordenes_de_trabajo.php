<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('estado')->updateOrInsert(
            ['nombre' => 'Pausada'],
            ['nombre' => 'Pausada'],
        );

        if (! Schema::hasColumn('orden_de_trabajo', 'estado_previo_pausa_id')) {
            Schema::table('orden_de_trabajo', function (Blueprint $table) {
                $table->foreignId('estado_previo_pausa_id')
                    ->nullable()
                    ->after('estado_id')
                    ->constrained('estado')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        $estadoPausadaId = DB::table('estado')->where('nombre', 'Pausada')->value('id');

        if ($estadoPausadaId && Schema::hasColumn('orden_de_trabajo', 'estado_previo_pausa_id')) {
            DB::table('orden_de_trabajo')
                ->where('estado_id', $estadoPausadaId)
                ->whereNotNull('estado_previo_pausa_id')
                ->update(['estado_id' => DB::raw('estado_previo_pausa_id')]);

            DB::table('orden_de_trabajo_historial_estados')
                ->where('estado_id', $estadoPausadaId)
                ->delete();
        }

        if (Schema::hasColumn('orden_de_trabajo', 'estado_previo_pausa_id')) {
            Schema::table('orden_de_trabajo', function (Blueprint $table) {
                $table->dropConstrainedForeignId('estado_previo_pausa_id');
            });
        }

        if ($estadoPausadaId) {
            DB::table('estado')->where('id', $estadoPausadaId)->delete();
        }
    }
};
