<?php

namespace App\Http\Controllers;

use App\Models\Marca;
use App\Models\Modelo;
use App\Models\Titular;
use App\Models\TitularVehiculo;
use App\Models\Vehiculo;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClienteController extends Controller
{
    /**
     * Listado de clientes con filtros y paginación
     */
    public function index(Request $request)
    {
        $query = Titular::with([
            'vehiculos.marca',
            'vehiculos.modelo',
            'vehiculos.titularVehiculos.ordenesDeTrabajo:id,titular_vehiculo_id,fecha,estado_id',
            'vehiculos.titularVehiculos.ordenesDeTrabajo.estado:id,nombre',
        ]);

        // Búsqueda por nombre, apellido, teléfono o email
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('nombre', 'like', "%{$search}%")
                    ->orWhere('apellido', 'like', "%{$search}%")
                    ->orWhere('telefono', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        $clientes = $query->orderBy('apellido')->orderBy('nombre')->paginate(20)->withQueryString();

        // Estadísticas
        $totalClientes = Titular::count();
        $clientesConVehiculos = Titular::has('vehiculos')->count();
        $clientesSinVehiculos = $totalClientes - $clientesConVehiculos;

        // Marcas para el formulario de nuevo vehículo
        $marcas = Marca::orderBy('nombre')->get();

        return Inertia::render('Clientes/Index', [
            'clientes' => $clientes,
            'filters' => $request->only(['search']),
            'stats' => [
                'total' => $totalClientes,
                'conVehiculos' => $clientesConVehiculos,
                'sinVehiculos' => $clientesSinVehiculos,
            ],
            'marcas' => $marcas,
        ]);
    }

    /**
     * Crear nuevo cliente
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
        ], [
            'nombre.required' => 'El nombre es obligatorio.',
            'apellido.required' => 'El apellido es obligatorio.',
            'email.email' => 'El email debe ser válido.',
        ]);

        Titular::create($validated);

        return redirect()->back()->with('success', 'Cliente creado correctamente.');
    }

    /**
     * Actualizar cliente existente
     */
    public function update(Request $request, Titular $cliente)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:100',
            'apellido' => 'required|string|max:100',
            'telefono' => 'nullable|string|max:50',
            'email' => 'nullable|email|max:100',
        ], [
            'nombre.required' => 'El nombre es obligatorio.',
            'apellido.required' => 'El apellido es obligatorio.',
            'email.email' => 'El email debe ser válido.',
        ]);

        $cliente->update($validated);

        return redirect()->back()->with('success', 'Cliente actualizado correctamente.');
    }

    /**
     * Eliminar cliente
     */
    public function destroy(Titular $cliente)
    {
        // Verificar si tiene órdenes de trabajo asociadas
        $tieneOrdenes = TitularVehiculo::where('titular_id', $cliente->id)
            ->whereHas('ordenesDeTrabajo')
            ->exists();

        if ($tieneOrdenes) {
            return redirect()->back()->with('error', 'No se puede eliminar: el cliente tiene órdenes de trabajo asociadas.');
        }

        // Eliminar relaciones pivot primero
        $cliente->vehiculos()->detach();
        $cliente->delete();

        return redirect()->back()->with('success', 'Cliente eliminado correctamente.');
    }

    /**
     * Asociar vehículo existente a cliente
     */
    public function attachVehicle(Titular $cliente, Vehiculo $vehiculo)
    {
        // Verificar si ya está asociado
        if ($cliente->vehiculos()->where('vehiculo.id', $vehiculo->id)->exists()) {
            return redirect()->back()->with('error', 'El vehículo ya está asociado a este cliente.');
        }

        $cliente->vehiculos()->attach($vehiculo->id);

        return redirect()->back()->with('success', 'Vehículo asociado correctamente.');
    }

    /**
     * Desasociar vehículo de cliente
     */
    public function detachVehicle(Titular $cliente, Vehiculo $vehiculo)
    {
        // Verificar si hay órdenes de trabajo con esta combinación
        $tieneOrdenes = TitularVehiculo::where('titular_id', $cliente->id)
            ->where('vehiculo_id', $vehiculo->id)
            ->whereHas('ordenesDeTrabajo')
            ->exists();

        if ($tieneOrdenes) {
            return redirect()->back()->with('error', 'No se puede desasociar: hay órdenes de trabajo con este vehículo.');
        }

        $cliente->vehiculos()->detach($vehiculo->id);

        // Si el vehículo ya no tiene dueños, eliminarlo completamente
        $tieneDuenos = $vehiculo->titulares()->count() > 0;
        if (! $tieneDuenos) {
            $vehiculo->delete();

            return redirect()->back()->with('success', 'Vehículo eliminado (no tenía otros dueños).');
        }

        return redirect()->back()->with('success', 'Vehículo desasociado correctamente.');
    }

    /**
     * Obtener vehículos disponibles (para asociar)
     */
    public function getVehiculosDisponibles(Titular $cliente)
    {
        $vehiculosAsociados = $cliente->vehiculos()->pluck('vehiculo.id');

        $disponibles = Vehiculo::with(['marca', 'modelo'])
            ->whereNotIn('id', $vehiculosAsociados)
            ->orderBy('patente')
            ->get();

        return response()->json($disponibles);
    }

    /**
     * Crear vehículo nuevo y asociarlo al cliente
     */
    public function createAndAttachVehicle(Request $request, Titular $cliente)
    {
        $validated = $request->validate([
            'patente' => [
                'required',
                'string',
                'max:20',
                'regex:/^(?:[A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/',
                'unique:vehiculo,patente',
            ],
            'marca_id' => 'required|exists:marcas,id',
            'modelo_id' => 'required|exists:modelos,id',
            'anio' => 'nullable|integer|min:1900|max:2100',
        ], [
            'patente.required' => 'La patente es obligatoria.',
            'patente.unique' => 'Ya existe un vehículo con esa patente.',
            'patente.regex' => 'Ingresá una patente válida. Ejemplos: ABC123 o AB123CD.',
            'marca_id.required' => 'Seleccione una marca.',
            'modelo_id.required' => 'Seleccione un modelo.',
        ]);

        // Crear el vehículo
        $vehiculo = Vehiculo::create($validated);

        // Asociarlo al cliente
        $cliente->vehiculos()->attach($vehiculo->id);

        return redirect()->back()->with('success', 'Vehículo creado y asociado correctamente.');
    }

    /**
     * Obtener modelos por marca (API)
     */
    public function getModelosByMarca($marcaId)
    {
        $modelos = Modelo::where('marca_id', $marcaId)->orderBy('nombre')->get();

        return response()->json($modelos);
    }

    /**
     * Eliminar vehículo completamente (solo si no tiene órdenes)
     */
    public function destroyVehicle(Vehiculo $vehiculo)
    {
        // Verificar si tiene órdenes de trabajo asociadas
        $tieneOrdenes = TitularVehiculo::where('vehiculo_id', $vehiculo->id)
            ->whereHas('ordenesDeTrabajo')
            ->exists();

        if ($tieneOrdenes) {
            return redirect()->back()->with('error', 'No se puede eliminar: el vehículo tiene órdenes de trabajo asociadas.');
        }

        // Eliminar relaciones pivot primero
        $vehiculo->titulares()->detach();
        $vehiculo->delete();

        return redirect()->back()->with('success', 'Vehículo eliminado correctamente.');
    }
}
