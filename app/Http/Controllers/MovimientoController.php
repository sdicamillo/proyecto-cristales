<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use App\Models\Movimiento;
use App\Models\Concepto;
use App\Models\MedioDePago;
use App\Models\Comprobante;
use App\Support\Authorization\RoleCapabilities;
use App\Support\Dolares;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

abstract class MovimientoController extends Controller
{
    protected function ensureFinancialAccess(Request $request): void
    {
        abort_unless(
            $request->user()?->hasCapability(RoleCapabilities::VIEW_FINANCIAL_MOVEMENTS),
            403,
            'No autorizado'
        );
    }

    /**
     * Con medio en dólares exige monto USD y tipo de cambio, y calcula el monto en pesos.
     */
    protected function normalizarDolares(array $data): array
    {
        $errores = [];
        $enDolares = ! empty($data['medio_de_pago_id'])
            && in_array((int) $data['medio_de_pago_id'], Dolares::idsMediosEnDolares(), true);

        $data = array_merge($data, Dolares::normalizar(
            $enDolares,
            $data['monto_usd'] ?? null,
            $data['tipo_cambio'] ?? null,
            $data['monto'],
            '',
            $errores,
        ));

        if (! empty($errores)) {
            throw ValidationException::withMessages($errores);
        }

        return $data;
    }

    /**
     * Tipo de movimiento ('ingreso' o 'egreso').
     * Cada subcontrolador va a definirlo.
     */
    protected string $tipo;

    /**
     * Nombre para mostrar en las vistas.
     */
    protected string $label;

    /**
     * Ruta base para las rutas del tipo de movimiento
     */
    protected string $ruta;

    /**
     * Listado de movimientos según el tipo
     */
    public function index()
    {
        $this->ensureFinancialAccess(request());

        $movimientos = Movimiento::with(['concepto', 'medioDePago'])
            ->where('tipo', $this->tipo)
            ->orderBy('fecha', 'desc')
            ->get();

        return Inertia::render('movimientos/index', [
            'movimientos' => $movimientos,
            'tipo' => $this->tipo,
            'label' => ucfirst($this->label)
        ]);
    }

    /**
     * Mostrar formulario de creación
     */
    public function create()
    {
        $this->ensureFinancialAccess(request());

        $conceptos = Concepto::where('tipo', $this->tipo)->orderBy('nombre', 'asc')->get();
        $mediosDePago = MedioDePago::orderBy('nombre', 'asc')->get();

        return Inertia::render('movimientos/create', [
            'conceptos' => $conceptos,
            'mediosDePago' => $mediosDePago,
            'tipo' => $this->tipo,
            'label' => ucfirst($this->label)
        ]);
    }

    /**
     * Guardar nuevo movimiento
     */
    public function store(Request $request)
    {
        $this->ensureFinancialAccess($request);

        $data = $request->validate([
            'fecha'            => 'required|date',
            'monto'            => 'required|numeric|min:0',
            'concepto_id'      => 'required|exists:concepto,id',
            'medio_de_pago_id' => 'nullable|exists:medio_de_pago,id',
            'monto_usd'        => 'nullable|numeric|min:0',
            'tipo_cambio'      => 'nullable|numeric|gt:0',
            'comprobantes'     => 'nullable|array',
            'comprobantes.*'   => 'file|mimes:jpg,jpeg,png,pdf|max:20480',
        ]);

        $data = $this->normalizarDolares($data);
        $data['tipo'] = $this->tipo;

        $movimiento = Movimiento::create($data);

        // Guardar comprobantes si vienen
        if ($request->hasFile('comprobantes')) {
            foreach ($request->file('comprobantes') as $archivo) {
                $path = $archivo->store('comprobantes/' . $this->tipo, 'public');

                Comprobante::create([
                    'movimiento_id' => $movimiento->id,
                    'ruta_archivo'  => $path,
                ]);
            }
        }

        return redirect()->route($this->ruta . '.index')
            ->with('success', $this->label . ' registrado correctamente');
    }

    /**
     * Mostrar un movimiento específico
     * FIX: Usar $id en vez de route model binding
     */
    public function show($id)
    {
        $this->ensureFinancialAccess(request());

        // Cargar el movimiento con TODAS sus relaciones
        $movimiento = Movimiento::with([
            'concepto',
            'medioDePago',
            'comprobantes',
            'ordenDeTrabajo'
        ])->findOrFail($id);

        // Determinar el label según el tipo del movimiento
        $label = $movimiento->tipo === 'ingreso' ? 'Ingreso' : 'Egreso';

        return Inertia::render('movimientos/show', [
            'movimiento' => $movimiento,
            'label' => $label,
            'tipo' => $movimiento->tipo, // Usar tipo del movimiento
        ]);
    }

    /**
     * Mostrar formulario de edición
     */
    public function edit($id)
    {
        $this->ensureFinancialAccess(request());

        $movimiento = Movimiento::with(['concepto', 'medioDePago', 'comprobantes'])->findOrFail($id);
        $conceptos = Concepto::where('tipo', $this->tipo)->orderBy('nombre', 'asc')->get();
        $mediosDePago = MedioDePago::orderBy('nombre', 'asc')->get();

        return Inertia::render('movimientos/edit', [
            'movimiento' => $movimiento,
            'conceptos' => $conceptos,
            'mediosDePago' => $mediosDePago,
            'label' => ucfirst($this->label),
            'tipo' => $this->tipo,
        ]);
    }

    /**
     * Actualizar un movimiento
     */
    public function update(Request $request, $id)
    {
        $this->ensureFinancialAccess($request);

        $movimiento = Movimiento::findOrFail($id);

        $data = $request->validate([
            'fecha'                  => 'required|date',
            'monto'                  => 'required|numeric|min:0',
            'concepto_id'            => 'required|exists:concepto,id',
            'medio_de_pago_id'       => 'nullable|exists:medio_de_pago,id',
            'monto_usd'              => 'nullable|numeric|min:0',
            'tipo_cambio'            => 'nullable|numeric|gt:0',

            'comprobantes'           => 'nullable|array',
            'comprobantes.*'         => 'file|mimes:jpg,jpeg,png,pdf|max:20480',

            'comprobantes_a_eliminar' => 'nullable|array',
            'comprobantes_a_eliminar.*' => 'integer|exists:comprobantes,id',
        ]);

        $data = $this->normalizarDolares($data);
        $movimiento->update($data);

        // 1) ELIMINAR comprobantes marcados
        if (!empty($data['comprobantes_a_eliminar'])) {
            foreach ($data['comprobantes_a_eliminar'] as $cid) {
                $comp = Comprobante::find($cid);
                if ($comp) {
                    Storage::disk('public')->delete($comp->ruta_archivo);
                    $comp->delete();
                }
            }
        }

        // 2) AGREGAR los nuevos comprobantes
        if ($request->hasFile('comprobantes')) {
            foreach ($request->file('comprobantes') as $archivo) {
                $path = $archivo->store("comprobantes/{$this->tipo}", 'public');
                Comprobante::create([
                    'movimiento_id' => $movimiento->id,
                    'ruta_archivo'  => $path,
                ]);
            }
        }

        return redirect()->route($this->ruta . '.index')
            ->with('success', $this->label . ' actualizado correctamente');
    }

    /**
     * Eliminar un movimiento
     */
    public function destroy(Movimiento $movimiento)
    {
        $this->ensureFinancialAccess(request());

        $movimiento->delete();

        return redirect()->route($this->ruta . '.index')
            ->with('success', $this->label . ' eliminado correctamente');
    }
}
