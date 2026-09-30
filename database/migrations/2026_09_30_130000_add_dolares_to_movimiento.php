<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // En movimientos en USD, "monto" sigue siendo el equivalente en pesos
        Schema::table('movimiento', function (Blueprint $table) {
            $table->decimal('monto_usd', 12, 2)->nullable()->after('monto');
            $table->decimal('tipo_cambio', 12, 2)->nullable()->after('monto_usd');
        });

        // Completar movimientos ya generados desde pagos en USD, solo si el pago es inequívoco
        $pagosUsd = DB::table('precio')
            ->whereNotNull('monto_usd')
            ->where('movimiento_registrado', true)
            ->get(['orden_de_trabajo_id', 'medio_de_pago_id', 'valor', 'monto_usd', 'tipo_cambio']);

        foreach ($pagosUsd as $pago) {
            $movimientos = DB::table('movimiento')
                ->where('orden_de_trabajo_id', $pago->orden_de_trabajo_id)
                ->where('medio_de_pago_id', $pago->medio_de_pago_id)
                ->where('monto', abs((float) $pago->valor))
                ->whereNull('monto_usd')
                ->pluck('id');

            if ($movimientos->count() !== 1) {
                continue;
            }

            DB::table('movimiento')->where('id', $movimientos->first())->update([
                'monto_usd' => abs((float) $pago->monto_usd),
                'tipo_cambio' => $pago->tipo_cambio,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('movimiento', function (Blueprint $table) {
            $table->dropColumn(['monto_usd', 'tipo_cambio']);
        });
    }
};
