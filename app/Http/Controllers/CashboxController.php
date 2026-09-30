<?php

namespace App\Http\Controllers;

use App\Models\CajaDiaria;
use App\Models\Movimiento;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CashboxController extends Controller
{
    public function open(Request $request)
    {
        $request->validate([
            'opening_balance' => 'required|numeric|min:0',
            'notes' => 'nullable|string|max:1000',
        ]);

        $today = Carbon::today()->toDateString();

        if (CajaDiaria::whereDate('fecha', $today)->exists()) {
            return back()->withErrors('Ya existe una caja para hoy.');
        }

        CajaDiaria::create([
            'fecha' => $today,
            'opened_at' => now(),
            'opening_balance' => $request->opening_balance,
            'opened_by_user_id' => $request->user()->id,
            'closing_notes' => $request->notes,
        ]);

        return back();
    }

    public function close(Request $request)
    {
        $today = Carbon::today()->toDateString();

        return DB::transaction(function () use ($request, $today) {
            $caja = CajaDiaria::whereDate('fecha', $today)->lockForUpdate()->first();

            if (!$caja) {
                return back()->withErrors('No existe apertura de caja para hoy.');
            }

            if ($caja->isClosed()) {
                return back()->withErrors('La caja ya fue cerrada.');
            }

            $totals = Movimiento::totalsForDate($today);
            $neto = $totals['ingresos'] - $totals['egresos'];
            $totalsUsd = Movimiento::totalsUsdForDate($today);

            $snapshot = [
                'ingresos_total' => $totals['ingresos'],
                'egresos_total' => $totals['egresos'],
                'neto_total' => $neto,
                'saldo_esperado' => $caja->opening_balance + $neto,
                // Dólares que entraron/salieron (no están incluidos en los totales en pesos)
                'ingresos_usd' => $totalsUsd['ingresos'],
                'egresos_usd' => $totalsUsd['egresos'],
                'neto_usd' => $totalsUsd['ingresos'] - $totalsUsd['egresos'],
            ];

            $caja->update([
                'closed_at' => now(),
                'closed_by_user_id' => $request->user()->id,
                'closing_notes' => $request->notes,
                'totals_snapshot' => $snapshot,
            ]);

            return back();
        });
    }
}
