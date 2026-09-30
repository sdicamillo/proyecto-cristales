<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class MedioDePago extends Model
{
    use HasFactory;
    
    public const MONEDA_ARS = 'ARS';
    public const MONEDA_USD = 'USD';

    protected $table = 'medio_de_pago';
    
    protected $fillable = [
        'nombre',
        'moneda',
    ];

    public function esEnDolares(): bool
    {
        return $this->moneda === self::MONEDA_USD;
    }
    
    public function movimientos()
    {
        return $this->hasMany(Movimiento::class, 'medio_de_pago_id');
    }

    public function ordenesDeTrabajo()
    {
        return $this->hasMany(OrdenDeTrabajo::class, 'medio_de_pago_id');
    }
    public function precios()
    {
        return $this->hasMany(Precio::class, 'medio_de_pago_id');
    }
    
}
