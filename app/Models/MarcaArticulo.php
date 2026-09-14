<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MarcaArticulo extends Model
{
    use HasFactory;

    protected $table = 'marcas_articulos';

    protected $fillable = [
        'nombre',
    ];

    public function detallesOrden()
    {
        return $this->hasMany(DetalleOrdenDeTrabajo::class, 'marca_articulo_id');
    }
}
