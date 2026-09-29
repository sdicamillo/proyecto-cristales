<?php

namespace App\Http\Controllers;

use App\Models\Marca;
use App\Models\Modelo;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CatalogoVehiculoController extends Controller
{
    /**
     * Mostrar listado de modelos con sus marcas
     */
    public function index(Request $request)
    {
        $query = Modelo::with('marca');

        // Búsqueda por marca o modelo
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                    ->orWhereHas('marca', function ($q2) use ($search) {
                        $q2->where('nombre', 'like', "%{$search}%");
                    });
            });
        }

        // Filtro por marca específica
        if ($request->filled('marca_id')) {
            $query->where('marca_id', $request->marca_id);
        }

        // Filtro por nombre de modelo
        if ($request->filled('modelo_filter')) {
            $query->where('nombre', 'like', '%' . $request->modelo_filter . '%');
        }

        // Primero por marca y después por modelo, para que el listado no mezcle marcas.
        // Se ordena con una subconsulta en vez de un join para no volver ambiguo el
        // campo "nombre" que usan los filtros de arriba.
        $modelos = $query
            ->orderBy(Marca::select('nombre')->whereColumn('marcas.id', 'modelos.marca_id'))
            ->orderBy('nombre')
            ->paginate(20)
            ->withQueryString();
        $marcas = Marca::orderBy('nombre')->get();

        return Inertia::render('CatalogoVehiculos/Index', [
            'modelos' => $modelos,
            'marcas' => $marcas,
            'filters' => $request->only(['search', 'marca_id', 'modelo_filter']),
        ]);
    }

    /**
     * Crear nuevo modelo (y marca si es necesario)
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'marca_id' => 'nullable|exists:marcas,id',
            'marca_nueva' => 'nullable|string|max:100',
            'modelo' => 'required|string|max:100',
        ], [
            'modelo.required' => 'El nombre del modelo es obligatorio.',
        ]);

        // Si viene marca_nueva, crearla
        if (!empty($validated['marca_nueva'])) {
            $marca = Marca::firstOrCreate(['nombre' => trim($validated['marca_nueva'])]);
            $marcaId = $marca->id;
        } else {
            $marcaId = $validated['marca_id'];
        }

        if (!$marcaId) {
            return redirect()->back()->withErrors(['marca_id' => 'Debés seleccionar o crear una marca.']);
        }

        // Verificar que no exista el modelo para esa marca
        $existe = Modelo::where('marca_id', $marcaId)
            ->where('nombre', trim($validated['modelo']))
            ->exists();

        if ($existe) {
            return redirect()->back()->withErrors(['modelo' => 'Este modelo ya existe para esa marca.']);
        }

        Modelo::create([
            'marca_id' => $marcaId,
            'nombre' => trim($validated['modelo']),
        ]);

        return redirect()->back()->with('success', 'Modelo agregado correctamente.');
    }

    /**
     * Actualizar modelo existente
     */
    public function update(Request $request, Modelo $modelo)
    {
        $validated = $request->validate([
            'marca_id' => 'required|exists:marcas,id',
            'nombre' => 'required|string|max:100',
        ]);

        // Verificar duplicados
        $existe = Modelo::where('marca_id', $validated['marca_id'])
            ->where('nombre', trim($validated['nombre']))
            ->where('id', '!=', $modelo->id)
            ->exists();

        if ($existe) {
            return redirect()->back()->withErrors(['nombre' => 'Este modelo ya existe para esa marca.']);
        }

        $modelo->update([
            'marca_id' => $validated['marca_id'],
            'nombre' => trim($validated['nombre']),
        ]);

        return redirect()->back()->with('success', 'Modelo actualizado.');
    }

    /**
     * Eliminar modelo
     */
    public function destroy(Modelo $modelo)
    {
        // Verificar si hay vehículos usando este modelo
        if ($modelo->vehiculos()->exists()) {
            return redirect()->back()->with('error', 'No se puede eliminar: hay vehículos usando este modelo.');
        }

        $modelo->delete();

        return redirect()->back()->with('success', 'Modelo eliminado.');
    }

    // ═══════════════════════════════════════════════════════════════
    // APIs internas (para dropdowns en otras pantallas)
    // ═══════════════════════════════════════════════════════════════

    public function getMarcas()
    {
        return response()->json(Marca::orderBy('nombre')->get());
    }

    public function getModelosByMarca($marcaId)
    {
        return response()->json(
            Modelo::where('marca_id', $marcaId)->orderBy('nombre')->get()
        );
    }
}
