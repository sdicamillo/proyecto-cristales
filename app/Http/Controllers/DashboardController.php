<?php

namespace App\Http\Controllers;

use App\Models\Movimiento;
use App\Models\OrdenDeTrabajo;
use App\Support\Authorization\RoleCapabilities;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $hoy = Carbon::today();

        if ((int) $user->role_id === 3) {
            return redirect()->route('taller.ots');
        }

        $canViewFinancialDashboard = $user->hasCapability(RoleCapabilities::VIEW_FINANCIAL_DASHBOARD);
        $canViewFinancialAmounts = $user->hasCapability(RoleCapabilities::VIEW_FINANCIAL_AMOUNTS);

        if (! $canViewFinancialDashboard) {
            return redirect()->route('ordenes.index');
        }

        $ordenesHoy = OrdenDeTrabajo::whereDate('fecha', $hoy)->count();

        $ultimasOrdenesQuery = OrdenDeTrabajo::with([
            'titularVehiculo.vehiculo.marca',
            'titularVehiculo.vehiculo.modelo',
        ])->orderBy('updated_at', 'desc');

        if ($canViewFinancialAmounts) {
            $ultimasOrdenesQuery->withSum('detalles', 'valor');
        }

        $ultimasOrdenes = $ultimasOrdenesQuery
            ->limit(5)
            ->get();

        $stats = [
            'totalEgresos' => null,
            'totalIngresos' => null,
            'totalOrdenes' => $ordenesHoy,
            'balanceDelDia' => null,
        ];

        $ultimosEgresos = collect();
        $ultimosIngresos = collect();

        if ($canViewFinancialDashboard) {
            // Pesos y dólares por separado
            $totales = Movimiento::totalsForDate($hoy->toDateString());
            $totalEgresos = $totales['egresos'];
            $totalIngresos = $totales['ingresos'];

            $ultimosEgresos = Movimiento::with(['concepto', 'medioDePago'])
                ->where('tipo', Movimiento::TIPO_EGRESO)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            $ultimosIngresos = Movimiento::with(['concepto', 'medioDePago'])
                ->where('tipo', Movimiento::TIPO_INGRESO)
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            $stats['totalEgresos'] = $totalEgresos;
            $stats['totalIngresos'] = $totalIngresos;
            $stats['balanceDelDia'] = $totalIngresos - $totalEgresos;

            $totalesUsd = Movimiento::totalsUsdForDate($hoy->toDateString());
            $stats['ingresosUsd'] = $totalesUsd['ingresos'];
            $stats['egresosUsd'] = $totalesUsd['egresos'];
            $stats['balanceUsd'] = $totalesUsd['ingresos'] - $totalesUsd['egresos'];
        }

        return Inertia::render('Administrador/inicio', [
            'stats' => $stats,
            'ultimosEgresos' => $ultimosEgresos,
            'ultimosIngresos' => $ultimosIngresos,
            'ultimasOrdenes' => $ultimasOrdenes,
        ]);
    }
}
