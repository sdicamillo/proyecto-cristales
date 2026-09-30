<?php

namespace App\Http\Controllers;

use App\Models\Movimiento;
use App\Models\OrdenDeTrabajo;
use App\Support\Authorization\RoleCapabilities;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class MetricsController extends Controller
{
    public function index(Request $request)
    {
        abort_unless(
            $request->user()?->hasCapability(RoleCapabilities::VIEW_FINANCIAL_METRICS),
            403,
            'No autorizado'
        );

        $toInput = $request->query('to');
        $fromInput = $request->query('from');

        $toDate = $toInput ? Carbon::parse($toInput) : Carbon::today();
        $fromDate = $fromInput ? Carbon::parse($fromInput) : (clone $toDate)->subDays(29);

        if ($fromDate->gt($toDate)) {
            $fromDate = (clone $toDate)->subDays(29);
        }

        $to = $toDate->toDateString();
        $from = $fromDate->toDateString();

        $kpis = $this->kpisForRange($from, $to);
        $composicionEgresos = $this->composicionEgresosForRange($from, $to);
        $mediosDePago = $this->mediosDePagoForRange($from, $to);
        $actividad = $this->actividadOperativaForRange($from, $to);

        return Inertia::render('Administrador/metrics', [
            'range' => [
                'from' => $from,
                'to' => $to,
            ],
            'kpis' => $kpis,
            'composicionEgresos' => $composicionEgresos,
            'mediosDePago' => $mediosDePago,
            'actividad' => $actividad,
        ]);
    }

    private function kpisForRange(string $from, string $to): array
    {
        $row = Movimiento::query()
            ->selectRaw(
                // Pesos y dólares por separado: los movimientos en USD no suman a los pesos
                "COALESCE(SUM(CASE WHEN tipo = ? AND monto_usd IS NULL THEN monto ELSE 0 END), 0) as ingresos,\n                 COALESCE(SUM(CASE WHEN tipo = ? AND monto_usd IS NULL THEN monto ELSE 0 END), 0) as egresos,\n                 COALESCE(SUM(CASE WHEN tipo = ? AND monto_usd IS NULL THEN 1 ELSE 0 END), 0) as egresos_count,\n                 COALESCE(SUM(CASE WHEN tipo = ? THEN monto_usd ELSE 0 END), 0) as ingresos_usd,\n                 COALESCE(SUM(CASE WHEN tipo = ? THEN monto_usd ELSE 0 END), 0) as egresos_usd",
                [Movimiento::TIPO_INGRESO, Movimiento::TIPO_EGRESO, Movimiento::TIPO_EGRESO, Movimiento::TIPO_INGRESO, Movimiento::TIPO_EGRESO]
            )
            ->whereBetween('fecha', [$from, $to])
            ->first();

        $ingresos = (float) ($row->ingresos ?? 0);
        $egresos = (float) ($row->egresos ?? 0);
        $egresosCount = (int) ($row->egresos_count ?? 0);
        $neto = $ingresos - $egresos;
        $promedioEgreso = $egresosCount > 0 ? $egresos / $egresosCount : 0.0;
        $ingresosUsd = (float) ($row->ingresos_usd ?? 0);
        $egresosUsd = (float) ($row->egresos_usd ?? 0);

        return [
            'ingresos' => $ingresos,
            'egresos' => $egresos,
            'neto' => $neto,
            'promedioEgreso' => $promedioEgreso,
            'ingresosUsd' => $ingresosUsd,
            'egresosUsd' => $egresosUsd,
            'netoUsd' => $ingresosUsd - $egresosUsd,
        ];
    }

    private function composicionEgresosForRange(string $from, string $to): array
    {
        // Pesos y dólares por separado: el % es sobre el total en pesos
        $totalEgresos = (float) Movimiento::query()
            ->whereBetween('fecha', [$from, $to])
            ->where('tipo', Movimiento::TIPO_EGRESO)
            ->whereNull('monto_usd')
            ->sum('monto');

        $rows = DB::table('movimiento as m')
            ->leftJoin('concepto as c', 'c.id', '=', 'm.concepto_id')
            ->selectRaw(
                "m.concepto_id as concepto_id,\n                 COALESCE(c.nombre, 'Sin concepto') as concepto,\n                 COALESCE(SUM(CASE WHEN m.monto_usd IS NULL THEN m.monto ELSE 0 END), 0) as total,\n                 SUM(m.monto_usd) as total_usd"
            )
            ->whereBetween('m.fecha', [$from, $to])
            ->where('m.tipo', Movimiento::TIPO_EGRESO)
            ->groupBy('m.concepto_id', 'c.nombre')
            ->orderByDesc('total')
            ->get();

        return collect($rows)
            ->map(function ($r) use ($totalEgresos) {
                $total = (float) $r->total;
                $totalUsd = $r->total_usd !== null ? (float) $r->total_usd : null;
                return [
                    'concepto' => (string) $r->concepto,
                    'total' => $total,
                    'total_usd' => $totalUsd,
                    // Un concepto solo en dólares no tiene porcentaje en pesos
                    'porcentaje' => $total == 0 && $totalUsd !== null
                        ? null
                        : ($totalEgresos > 0 ? round(($total / $totalEgresos) * 100, 2) : 0.0),
                ];
            })
            ->values()
            ->all();
    }

    private function mediosDePagoForRange(string $from, string $to): array
    {
        // Pesos y dólares por separado: el % es sobre el total en pesos
        $totalMovimientos = (float) Movimiento::query()
            ->whereBetween('fecha', [$from, $to])
            ->whereNull('monto_usd')
            ->sum('monto');

        $rows = DB::table('movimiento as m')
            ->leftJoin('medio_de_pago as mp', 'mp.id', '=', 'm.medio_de_pago_id')
            ->selectRaw(
                "COALESCE(m.medio_de_pago_id, 0) as medio_de_pago_id,\n                 COALESCE(mp.nombre, 'Sin medio') as medio,\n                 COALESCE(mp.moneda, 'ARS') as moneda,\n                 COALESCE(SUM(CASE WHEN m.monto_usd IS NULL THEN m.monto ELSE 0 END), 0) as total,\n                 SUM(m.monto_usd) as total_usd,\n                 COUNT(*) as cantidad"
            )
            ->whereBetween('m.fecha', [$from, $to])
            ->groupBy('m.medio_de_pago_id', 'mp.nombre', 'mp.moneda')
            ->orderByDesc('total')
            ->get();

        return collect($rows)
            ->map(function ($r) use ($totalMovimientos) {
                $total = (float) $r->total;
                $totalUsd = $r->total_usd !== null ? (float) $r->total_usd : null;
                $cantidad = (int) $r->cantidad;

                return [
                    'medio' => (string) $r->medio,
                    'moneda' => (string) $r->moneda,
                    'total' => $total,
                    'total_usd' => $totalUsd,
                    'cantidad' => $cantidad,
                    'porcentaje' => $totalUsd !== null
                        ? null
                        : ($totalMovimientos > 0 ? round(($total / $totalMovimientos) * 100, 2) : 0.0),
                ];
            })
            ->values()
            ->all();
    }

    private function actividadOperativaForRange(string $from, string $to): array
    {
        $otCreadas = (int) OrdenDeTrabajo::query()
            ->whereBetween('fecha', [$from, $to])
            ->whereHas('estado', fn($q) => $q->where('nombre', '!=', 'Anulada'))
            ->count();

        $otCompletadas = (int) OrdenDeTrabajo::query()
            ->leftJoin('estado as e', 'e.id', '=', 'orden_de_trabajo.estado_id')
            ->whereBetween('orden_de_trabajo.fecha', [$from, $to])
            ->where('e.nombre', 'Completada')
            ->count();

        $otPendientes = (int) OrdenDeTrabajo::query()
            ->leftJoin('estado as e', 'e.id', '=', 'orden_de_trabajo.estado_id')
            ->whereIn('e.nombre', ['Iniciado', 'Pendiente'])
            ->count();

        $movimientosCaja = (int) Movimiento::query()
            ->whereBetween('fecha', [$from, $to])
            ->count();

        return [
            'otCreadas' => $otCreadas,
            'otCerradas' => $otCompletadas,
            'otPendientes' => $otPendientes,
            'movimientosCaja' => $movimientosCaja,
        ];
    }
}
