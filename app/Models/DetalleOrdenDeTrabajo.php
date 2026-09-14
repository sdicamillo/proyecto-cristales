<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DetalleOrdenDeTrabajo extends Model
{
    use HasFactory;

    protected $table = 'detalle_orden_de_trabajo';

    protected $fillable = [
        'orden_de_trabajo_id',
        'articulo_id',
        'marca_articulo_id',
        'descripcion',
        'valor',
        'cantidad',
        'colocacion_incluida',
    ];

    // =========================
    // Relaciones
    // =========================

    public function ordenDeTrabajo()
    {
        return $this->belongsTo(OrdenDeTrabajo::class, 'orden_de_trabajo_id');
    }

    public function articulo()
    {
        return $this->belongsTo(Articulo::class, 'articulo_id');
    }

    public function marcaArticulo()
    {
        return $this->belongsTo(MarcaArticulo::class, 'marca_articulo_id');
    }

    public function atributos()
    {
        return $this->hasMany(\App\Models\DetalleOrdenAtributo::class, 'detalle_orden_de_trabajo_id');
    }
    
    public function edit(OrdenDeTrabajo $orden)
{
    $orden->load([
        'estado',
        'titularVehiculo.titular',
        'titularVehiculo.vehiculo.marca',
        'titularVehiculo.vehiculo.modelo',
        'detalles.atributos',          // 👈 clave
        'pagos.medioDePago',
    ]);

    $estados = Estado::select('id','nombre')->orderBy('nombre')->get();
    $mediosDePago = MedioDePago::select('id','nombre')->orderBy('nombre')->get();

    $articulos = Articulo::with(['categorias.subcategorias'])
        ->select('id','nombre')
        ->get();

    $companiasSeguros = CompaniaSeguro::select('id','nombre')
        ->where('activo', true)
        ->orderBy('nombre')
        ->get();

    // Transformación para que el front reciba "atributos" como Record<categoriaId, subcategoriaId|null>
    $orden->detalles->transform(function ($d) {
        $map = [];
        foreach ($d->atributos as $a) {
            $map[(int)$a->categoria_id] = (int)$a->subcategoria_id;
        }
        $d->atributos_map = $map; // campo virtual
        return $d;
    });

    return Inertia::render('ordenes/edit', [
        'orden' => $orden,
        'estados' => $estados,
        'mediosDePago' => $mediosDePago,
        'articulos' => $articulos,
        'companiasSeguros' => $companiasSeguros,
    ]);
}

}
