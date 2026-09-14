<?php

namespace App\Http\Controllers;

use App\Models\MarcaArticulo;
use Illuminate\Http\Request;

class MarcaArticuloController extends Controller
{
    /**
     * Obtener todas las marcas de artículos
     */
    public function index()
    {
        $marcas = MarcaArticulo::orderBy('nombre')->get();
        return response()->json($marcas);
    }

    /**
     * Crear una nueva marca de artículo
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50',
        ], [
            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.max' => 'El nombre no puede superar los 50 caracteres.',
        ]);

        $nombreLimpio = trim($validated['nombre']);

        $marca = MarcaArticulo::firstOrCreate(['nombre' => $nombreLimpio]);

        return response()->json($marca, 201);
    }
}
