<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Precio extends Model
{
    use HasFactory;

    protected $table = 'precio';

    protected $fillable = [
        'orden_de_trabajo_id',
        'medio_de_pago_id',
        'valor',
        'monto_usd',
        'tipo_cambio',
        'fecha',
        'pagado',
        'bloqueado',
        'movimiento_registrado', // NUEVO
        'observacion',
    ];

    protected $casts = [
        'fecha' => 'date',
        'valor' => 'decimal:2',
        'monto_usd' => 'decimal:2',
        'tipo_cambio' => 'decimal:2',
        'pagado' => 'boolean',
        'bloqueado' => 'boolean',
        'movimiento_registrado' => 'boolean', // NUEVO
    ];

    /**
     * Relación con la orden de trabajo
     */
    public function ordenDeTrabajo(): BelongsTo
    {
        return $this->belongsTo(OrdenDeTrabajo::class, 'orden_de_trabajo_id');
    }

    /**
     * Relación con el medio de pago
     */
    public function medioDePago(): BelongsTo
    {
        return $this->belongsTo(MedioDePago::class, 'medio_de_pago_id');
    }
}