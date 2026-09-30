<?php

namespace App\Http\Controllers;

use App\Models\Movimiento;
use App\Support\Authorization\RoleCapabilities;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DailySummaryController extends Controller
{
    public function show(Request $request)
    {
        abort_unless(
            $request->user()?->hasCapability(RoleCapabilities::VIEW_FINANCIAL_REPORTS),
            403,
            'No autorizado'
        );

        $date = $request->query('date', Carbon::today()->toDateString());

        $totals = Movimiento::totalsForDate($date);
        $neto = $totals['ingresos'] - $totals['egresos'];
        $totalsUsd = Movimiento::totalsUsdForDate($date);

        $ingresosPorMedio = Movimiento::groupedByMedioPago($date, 'ingreso');
        $egresosPorMedio = Movimiento::groupedByMedioPago($date, 'egreso');

        return Inertia::render('DailySummary/index', [
            'fecha' => $date,
            'kpis' => [
                'ingresos' => $totals['ingresos'],
                'egresos' => $totals['egresos'],
                'neto' => $neto,
            ],
            'kpisUsd' => [
                'ingresos' => $totalsUsd['ingresos'],
                'egresos' => $totalsUsd['egresos'],
                'neto' => $totalsUsd['ingresos'] - $totalsUsd['egresos'],
            ],
            'ingresosPorMedio' => $ingresosPorMedio,
            'egresosPorMedio' => $egresosPorMedio,
            'today' => Carbon::today()->toDateString(),
        ]);
    }

    public function print(Request $request)
{
    abort_unless(
        $request->user()?->hasCapability(RoleCapabilities::VIEW_FINANCIAL_REPORTS),
        403,
        'No autorizado'
    );

    $date = $request->query('date', Carbon::today()->toDateString());

    // KPIs
    $totals = Movimiento::totalsForDate($date);
    $ingresos = (float) ($totals['ingresos'] ?? 0);
    $egresos  = (float) ($totals['egresos'] ?? 0);
    $neto     = $ingresos - $egresos;
    $totalsUsd = Movimiento::totalsUsdForDate($date);

    // Tablas por medio de pago
    $ingresosPorMedio = Movimiento::groupedByMedioPago($date, Movimiento::TIPO_INGRESO);
    $egresosPorMedio  = Movimiento::groupedByMedioPago($date, Movimiento::TIPO_EGRESO);

    return view('daily-summary.print', [
        'fecha' => $date,
        'kpis' => [
            'ingresos' => $ingresos,
            'egresos' => $egresos,
            'neto' => $neto,
        ],
        'kpisUsd' => [
            'ingresos' => $totalsUsd['ingresos'],
            'egresos' => $totalsUsd['egresos'],
            'neto' => $totalsUsd['ingresos'] - $totalsUsd['egresos'],
        ],
        'ingresosPorMedio' => $ingresosPorMedio,
        'egresosPorMedio' => $egresosPorMedio,
    ]);
}

}
