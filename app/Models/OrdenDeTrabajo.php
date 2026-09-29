<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrdenDeTrabajo extends Model
{
    use HasFactory;

    protected $table = 'orden_de_trabajo';

    protected $fillable = [
        'titular_vehiculo_id',
        'compania_seguro_id',
        'estado_id',
        'asignado_a_id',
        'completado_por_id',
        'fecha',
        'con_factura',
        'observacion',
        'fecha_entrega_estimada',
        'numero_orden',
        'es_garantia',
    ];

    protected $casts = [
        'fecha' => 'datetime',     // en DB es datetime
        'fecha_entrega_estimada' => 'datetime',
        'con_factura' => 'boolean',
    ];

    public function titularVehiculo()
    {
        return $this->belongsTo(TitularVehiculo::class, 'titular_vehiculo_id');
    }

    public function asignadoA()
    {
        return $this->belongsTo(User::class, 'asignado_a_id');
    }

    public function completadoPor()
    {
        return $this->belongsTo(User::class, 'completado_por_id');
    }

    public function estado()
    {
        return $this->belongsTo(Estado::class, 'estado_id');
    }

    public function detalles()
    {
        return $this->hasMany(DetalleOrdenDeTrabajo::class, 'orden_de_trabajo_id');
    }

    public function companiaSeguro()
    {
        return $this->belongsTo(\App\Models\CompaniaSeguro::class, 'compania_seguro_id')
            ->withTrashed();
    }

    public function pagos()
    {
        return $this->hasMany(\App\Models\Precio::class, 'orden_de_trabajo_id');
    }

    public function historialEstados()
    {
        return $this->hasMany(OrdenDeTrabajoHistorialEstado::class, 'orden_de_trabajo_id')
                    ->orderBy('created_at', 'asc');
    }


}
