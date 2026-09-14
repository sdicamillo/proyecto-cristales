<?php

namespace App\Http\Controllers;

use App\Models\MarcaArticulo;
use Illuminate\Http\Request;
use Inertia\Inertia;

class MarcaArticuloController extends Controller
{
    /**
     * Listar marcas de artículos (para el Maestro en Inertia o JSON para API).
     */
    public function index(Request $request)
    {
        if ($request->wantsJson() || $request->is('api/*')) {
            $marcas = MarcaArticulo::orderBy('nombre')->get();
            return response()->json($marcas);
        }

        $query = MarcaArticulo::query();

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where('nombre', 'like', "%{$search}%");
        }

        $marcas = $query->orderBy('nombre')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('marcas-articulos/index', [
            'marcas' => $marcas,
            'filters' => $request->only(['search']),
        ]);
    }

    /**
     * Crear una nueva marca de artículo.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:marcas_articulos,nombre',
        ], [
            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.max' => 'El nombre no puede superar los 50 caracteres.',
            'nombre.unique' => 'Ya existe una marca con este nombre.',
        ]);

        $nombreLimpio = trim($validated['nombre']);
        $marca = MarcaArticulo::firstOrCreate(['nombre' => $nombreLimpio]);

        if ($request->wantsJson() || $request->is('api/*')) {
            return response()->json($marca, 201);
        }

        return redirect()->back()->with('success', 'Marca de artículo creada correctamente.');
    }

    /**
     * Actualizar marca de artículo existente.
     */
    public function update(Request $request, MarcaArticulo $marcas_articulo)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:50|unique:marcas_articulos,nombre,' . $marcas_articulo->id,
        ], [
            'nombre.required' => 'El nombre de la marca es obligatorio.',
            'nombre.max' => 'El nombre no puede superar los 50 caracteres.',
            'nombre.unique' => 'Ya existe una marca con este nombre.',
        ]);

        $marcas_articulo->update([
            'nombre' => trim($validated['nombre']),
        ]);

        return redirect()->back()->with('success', 'Marca de artículo actualizada correctamente.');
    }

    /**
     * Eliminar marca de artículo.
     */
    public function destroy(MarcaArticulo $marcas_articulo)
    {
        // Verificar si hay detalles de orden usando esta marca
        if ($marcas_articulo->detallesOrden()->exists()) {
            return redirect()->back()->with('error', 'No se puede eliminar: la marca está siendo utilizada en órdenes de trabajo.');
        }

        $marcas_articulo->delete();

        return redirect()->back()->with('success', 'Marca de artículo eliminada.');
    }
}
