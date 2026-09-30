<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Movimiento extends Model
{
    use HasFactory;

    protected $table = 'movimiento';

    public const TIPO_INGRESO = 'ingreso';
    public const TIPO_EGRESO  = 'egreso';

    protected $fillable = [
        'fecha',
        'monto',
        'monto_usd',
        'tipo_cambio',
        'concepto_id',
        'medio_de_pago_id',
        'tipo',
        'orden_de_trabajo_id', // AGREGADO
    ];

    protected $casts = [
        'fecha' => 'datetime',
        'monto' => 'float',
        'monto_usd' => 'float',
        'tipo_cambio' => 'float',
    ];

    /* ======================
     * Relations
     * ====================== */

    public function concepto(): BelongsTo
    {
        return $this->belongsTo(Concepto::class, 'concepto_id');
    }

    public function medioDePago(): BelongsTo
    {
        return $this->belongsTo(MedioDePago::class, 'medio_de_pago_id');
    }

    public function comprobantes(): HasMany
    {
        return $this->hasMany(Comprobante::class, 'movimiento_id');
    }

    // NUEVA RELACIÓN
    public function ordenDeTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenDeTrabajo::class, 'orden_de_trabajo_id');
    }

    /* ======================
     * Scopes
     * ====================== */

    public function scopeForDate($query, string $date)
    {
        return $query->whereDate('fecha', $date);
    }

    public function scopeOfTipo($query, string $tipo)
    {
        return $query->where('tipo', $tipo);
    }

    public function scopeIngresos($query)
    {
        return $query->where('tipo', self::TIPO_INGRESO);
    }

    public function scopeEgresos($query)
    {
        return $query->where('tipo', self::TIPO_EGRESO);
    }

    /* ======================
     * Queries del resumen
     * ====================== */

    /**
     * Totales en pesos de ingresos/egresos para una fecha (Y-m-d).
     * Los movimientos en dólares no suman acá: van en totalsUsdForDate().
     */
    public static function totalsForDate(string $date): array
    {
        $row = self::query()
            ->selectRaw("
                COALESCE(SUM(CASE WHEN tipo = ? AND monto_usd IS NULL THEN monto ELSE 0 END), 0) as ingresos,
                COALESCE(SUM(CASE WHEN tipo = ? AND monto_usd IS NULL THEN monto ELSE 0 END), 0) as egresos
            ", [self::TIPO_INGRESO, self::TIPO_EGRESO])
            ->whereDate('fecha', $date)
            ->first();

        return [
            'ingresos' => (float) ($row->ingresos ?? 0),
            'egresos'  => (float) ($row->egresos ?? 0),
        ];
    }

    /**
     * Totales en USD de ingresos/egresos para una fecha (Y-m-d).
     */
    public static function totalsUsdForDate(string $date): array
    {
        $row = self::query()
            ->selectRaw("
                COALESCE(SUM(CASE WHEN tipo = ? THEN monto_usd ELSE 0 END), 0) as ingresos,
                COALESCE(SUM(CASE WHEN tipo = ? THEN monto_usd ELSE 0 END), 0) as egresos
            ", [self::TIPO_INGRESO, self::TIPO_EGRESO])
            ->whereDate('fecha', $date)
            ->first();

        return [
            'ingresos' => (float) ($row->ingresos ?? 0),
            'egresos'  => (float) ($row->egresos ?? 0),
        ];
    }

    /**
     * Agrupación por medio de pago para una fecha y tipo.
     * Devuelve: medio_de_pago_id, medio, moneda, total, total_usd, cantidad, porcentaje
     * Pesos y dólares van separados: "total" solo suma pesos, "total_usd" solo dólares,
     * y el porcentaje es sobre el total en pesos (null en las filas en dólares).
     */
    public static function groupedByMedioPago(string $date, string $tipo): Collection
    {
        if (!in_array($tipo, [self::TIPO_INGRESO, self::TIPO_EGRESO], true)) {
            throw new \InvalidArgumentException("Tipo de movimiento inválido: {$tipo}");
        }

        // Total en pesos para calcular % (por tipo)
        $total = (float) self::query()
            ->whereDate('fecha', $date)
            ->where('tipo', $tipo)
            ->whereNull('monto_usd')
            ->sum('monto');

        $rows = DB::table('movimiento as m')
            ->leftJoin('medio_de_pago as mp', 'mp.id', '=', 'm.medio_de_pago_id')
            ->selectRaw("
                COALESCE(m.medio_de_pago_id, 0) as medio_de_pago_id,
                COALESCE(mp.nombre, 'Sin medio') as medio,
                COALESCE(mp.moneda, 'ARS') as moneda,
                COALESCE(SUM(CASE WHEN m.monto_usd IS NULL THEN m.monto ELSE 0 END), 0) as total,
                SUM(m.monto_usd) as total_usd,
                COUNT(*) as cantidad
            ")
            ->whereDate('m.fecha', $date)
            ->where('m.tipo', $tipo)
            ->groupBy('m.medio_de_pago_id', 'mp.nombre', 'mp.moneda')
            ->orderByDesc('total')
            ->get();

        return $rows->map(function ($r) use ($total) {
            $r->total = (float) $r->total;
            $r->total_usd = $r->total_usd !== null ? (float) $r->total_usd : null;
            $r->cantidad = (int) $r->cantidad;
            $r->porcentaje = $r->total_usd !== null
                ? null
                : ($total > 0 ? round(($r->total / $total) * 100, 2) : 0.0);
            return $r;
        });
    }
}