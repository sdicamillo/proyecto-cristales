<?php

namespace App\Http\Controllers;

use App\Models\Articulo;
use App\Models\CompaniaSeguro;
use App\Models\Concepto;
use App\Models\DetalleOrdenAtributo;
use App\Models\DetalleOrdenDeTrabajo;
use App\Models\Estado;
use App\Models\Marca;
use App\Models\MarcaArticulo;
use App\Models\MedioDePago;
use App\Models\Modelo;
use App\Models\Movimiento;
use App\Models\OrdenDeTrabajo;
use App\Models\OrdenDeTrabajoHistorialEstado;
use App\Models\Precio;
use App\Models\Subcategoria;
use App\Models\Titular;
use App\Models\TitularVehiculo;
use App\Models\User;
use App\Models\Vehiculo;
use App\Support\Authorization\RoleCapabilities;
use App\Support\Dolares;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class OrdenDeTrabajoController extends Controller
{
    public function index(Request $request)
    {
        if ($this->isTallerUser()) {
            return redirect()->route('taller.ots');
        }

        $perPage = $request->integer('per_page', 10);

        $ordenes = OrdenDeTrabajo::query()
            ->with([
                'titularVehiculo.titular',
                'titularVehiculo.vehiculo.marca',
                'titularVehiculo.vehiculo.modelo',
                'estado',
                'pagos',
            ])
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = $request->q;

                $query->where(function ($sub) use ($q) {
                    $sub->whereHas('titularVehiculo.titular', function ($q2) use ($q) {
                        $q2->where('nombre', 'like', "%{$q}%")
                            ->orWhere('apellido', 'like', "%{$q}%");
                    })
                        ->orWhereHas('titularVehiculo.vehiculo', function ($q2) use ($q) {
                            $q2->where('patente', 'like', "%{$q}%");
                        });
                });
            })
            ->when(
                $request->filled('estado_id'),
                fn ($q) => $q->where('estado_id', $request->estado_id)
            )
            ->when($request->filled('con_factura'), function ($q) use ($request) {
                $q->where('con_factura', (int) $request->con_factura);
            })
            ->when(
                $request->filled('date_from'),
                fn ($q) => $q->whereDate('fecha', '>=', $request->date_from)
            )
            ->when(
                $request->filled('date_to'),
                fn ($q) => $q->whereDate('fecha', '<=', $request->date_to)
            )
            ->orderByDesc('fecha')
            ->orderByDesc('orden_de_trabajo.id')
            ->paginate($perPage)
            ->withQueryString();

        // Calcular estado de pago para cada orden
        $ordenes->getCollection()->transform(function ($orden) {
            $totalOrden = $orden->detalles->sum(function ($detalle) {
                return $detalle->valor * $detalle->cantidad;
            });

            $totalPagado = $orden->pagos->where('pagado', true)->sum('valor');
            $saldoPendiente = $totalOrden - $totalPagado;

            if ($totalOrden == 0) {
                $orden->estado_pago = 'Sin pagar';
            } elseif ($saldoPendiente < 0) {
                $orden->estado_pago = 'Sobrepago';
            } elseif ($saldoPendiente == 0) {
                $orden->estado_pago = 'Pagado';
            } elseif ($totalPagado > 0 && $saldoPendiente > 0) {
                $orden->estado_pago = 'Pago parcial';
            } else {
                $orden->estado_pago = 'Sin pagar';
            }

            return $orden;
        });

        $estados = Estado::select('id', 'nombre')
            ->orderBy('nombre')
            ->get();

        return Inertia::render('ordenes/index', [
            'ordenes' => $ordenes,
            'estados' => $estados,
            'filters' => $request->only([
                'q',
                'estado_id',
                'con_factura',
                'date_from',
                'date_to',
                'per_page',
            ]),
        ]);
    }

    public function create()
    {
        if ($this->isTallerUser()) {
            return redirect()->route('taller.ots');
        }

        $titulares = Titular::with([
            'vehiculos' => function ($query) {
                $query->select('vehiculo.id', 'patente', 'marca_id', 'modelo_id', 'anio')
                    ->with(['marca:id,nombre', 'modelo:id,nombre']);
            },
        ])
            ->select('id', 'nombre', 'apellido', 'telefono', 'email')
            ->get();

        $estados = Estado::select('id', 'nombre')
            ->where('nombre', '!=', Estado::NOMBRE_PAUSADA)
            ->get();
        $mediosDePago = MedioDePago::select('id', 'nombre', 'moneda')->get();

        $articulos = Articulo::with(['categorias.subcategorias'])
            ->select('id', 'nombre')
            ->get();

        $companiasSeguros = CompaniaSeguro::query()
            ->where('activo', 1)
            ->orderBy('nombre')
            ->get(['id', 'nombre']);

        $marcasArticulos = MarcaArticulo::select('id', 'nombre')->orderBy('nombre')->get();

        return Inertia::render('ordenes/createOrdenes', [
            'titulares' => $titulares,
            'estados' => $estados,
            'usuarios' => User::orderBy('name')->get(['id', 'name']),
            'mediosDePago' => $mediosDePago,
            'articulos' => $articulos,
            'companiasSeguros' => $companiasSeguros,
            'marcasArticulos' => $marcasArticulos,
            'tipo_documento' => 'OT',
            'con_factura' => false,
        ]);
    }

    public function store(Request $request)
    {
        abort_if($this->isTallerUser(), 403);

        $validated = $request->validate([
            'estado_id' => ['required', Rule::exists('estado', 'id')->where(fn ($query) => $query->where('nombre', '!=', Estado::NOMBRE_PAUSADA))],
            'asignado_a_id' => ['nullable', 'integer', 'exists:users,id'],
            'completado_por_id' => [Rule::requiredIf(fn () => Estado::whereKey($request->input('estado_id'))->whereIn('nombre', [Estado::NOMBRE_FINALIZADA, Estado::NOMBRE_RETIRADA])->exists()), 'nullable', 'integer', 'exists:users,id'],
            'fecha' => 'required|date',
            'fecha_entrega_estimada' => 'required|date|after_or_equal:fecha',
            'observacion' => 'nullable|string|max:500',
            'con_factura' => 'nullable|boolean',
            'tipo_documento' => 'nullable|in:FC,OT',
            'compania_seguro_id' => [
                'nullable',
                'integer',
                Rule::exists('companias_seguros', 'id')->whereNull('deleted_at')->where('activo', 1),
            ],
            'es_garantia' => 'required|boolean',
            'numero_orden' => 'nullable|string|max:32',
            'detalles' => 'required|array|min:1',
            'detalles.*.articulo_id' => 'required|integer|exists:articulos,id',
            'detalles.*.marca_articulo_id' => 'nullable|integer|exists:marcas_articulos,id',
            'detalles.*.descripcion' => 'nullable|string|max:255',
            'detalles.*.valor' => 'required|numeric|min:0',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.colocacion_incluida' => 'boolean',
            'detalles.*.atributos' => 'nullable|array',
            'detalles.*.atributos.*' => 'nullable|integer|exists:subcategorias,id',
            'pagos' => 'required|array|min:1',
            'pagos.*.medio_de_pago_id' => 'required|exists:medio_de_pago,id',
            'pagos.*.monto' => 'required|numeric',
            'pagos.*.fecha' => 'required|date',
            'pagos.*.pagado' => 'required|boolean',
            'pagos.*.observacion' => 'nullable|string|max:255',
            'pagos.*.monto_usd' => 'nullable|numeric',
            'pagos.*.tipo_cambio' => 'nullable|numeric|gt:0',
            'titular_id' => 'nullable|integer|exists:titular,id',
            'vehiculo_id' => 'nullable|integer|exists:vehiculo,id',
            'nuevo_titular' => 'nullable|array',
            'nuevo_vehiculo' => 'nullable|array',
            'nuevo_vehiculo.patente' => ['required_without:vehiculo_id', 'string', 'max:10', 'regex:/^(?:[A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/', 'unique:vehiculo,patente'],
            'nuevo_vehiculo.marca_id' => 'nullable|integer|exists:marcas,id',
            'nuevo_vehiculo.marca_nueva' => 'nullable|string|max:50',
            'nuevo_vehiculo.modelo_id' => 'nullable|integer|exists:modelos,id',
            'nuevo_vehiculo.modelo_nuevo' => 'nullable|string|max:50',
            'nuevo_vehiculo.anio' => 'nullable|integer|min:1900|max:'.date('Y'),
        ], [
            'completado_por_id.required' => 'Seleccioná quién completó el trabajo.',
            'completado_por_id.exists' => 'La persona seleccionada no existe.',
            'asignado_a_id.exists' => 'La persona asignada no existe.',
            'estado_id.required' => 'Seleccioná un estado para la orden.',
            'fecha.required' => 'La fecha de la orden es obligatoria.',
            'fecha_entrega_estimada.required' => 'Ingresá una fecha de entrega estimada.',
            'fecha_entrega_estimada.after_or_equal' => 'La fecha de entrega no puede ser anterior a la fecha de la orden.',
            'es_garantia.required' => 'Indicá si es una garantía.',
            'detalles.required' => 'Agregá al menos un artículo a la orden.',
            'detalles.min' => 'Agregá al menos un artículo a la orden.',
            'detalles.*.articulo_id.required' => 'Hay artículos sin seleccionar.',
            'detalles.*.articulo_id.exists' => 'Uno de los artículos seleccionados no existe.',
            'detalles.*.valor.required' => 'Hay artículos sin precio. Ingresá el valor de cada uno.',
            'detalles.*.valor.min' => 'El precio de los artículos no puede ser negativo.',
            'detalles.*.cantidad.required' => 'Hay artículos sin cantidad especificada.',
            'detalles.*.cantidad.min' => 'La cantidad de cada artículo debe ser al menos 1.',
            'pagos.required' => 'Agregá al menos un medio de pago.',
            'pagos.min' => 'Agregá al menos un medio de pago.',
            'pagos.*.medio_de_pago_id.required' => 'Seleccioná un medio de pago.',
            'pagos.*.medio_de_pago_id.exists' => 'El medio de pago seleccionado no existe.',
            'pagos.*.monto.required' => 'Ingresá el monto del pago.',
            'pagos.*.fecha.required' => 'Ingresá la fecha del pago.',
            'pagos.*.fecha.date' => 'La fecha del pago debe ser válida.',
            'nuevo_vehiculo.patente.max' => 'La patente no puede superar los 10 caracteres.',
            'nuevo_vehiculo.marca_nueva.max' => 'El nombre de la marca no puede superar los 50 caracteres.',
            'nuevo_vehiculo.modelo_nuevo.max' => 'El nombre del modelo no puede superar los 50 caracteres.',
        ]);

        $validated['pagos'] = $this->normalizarPagos($validated['pagos']);

        $totalOrden = collect($validated['detalles'])->reduce(function ($acc, $detalle) {
            return $acc + (floatval($detalle['valor']) * intval($detalle['cantidad']));
        }, 0);

        // --- NUEVA VALIDACIÓN PARA CREACIÓN ---
        $estadoFinalizada = Estado::whereIn('nombre', [Estado::NOMBRE_FINALIZADA, Estado::NOMBRE_RETIRADA])->where('id', $validated['estado_id'])->first();

        if ($estadoFinalizada && (int) $validated['estado_id'] === $estadoFinalizada->id) {
            // Sumamos los montos de los pagos que se están enviando como "pagado"
            $totalPagado = collect($validated['pagos'])
                ->where('pagado', true)
                ->sum('monto');

            if ($totalPagado < $totalOrden) {
                $falta = $totalOrden - $totalPagado;

                return back()
                    ->withErrors(['estado_id' => 'La orden debe estar totalmente pagada para marcarla como finalizada o retirada. Saldo pendiente: $'.number_format($falta, 2)])
                    ->withInput();
            }
        }
        // --- FIN DE VALIDACIÓN ---

        if ($totalOrden <= 0) {
            return back()
                ->withErrors(['detalles' => 'El total de la orden debe ser mayor a $0.'])
                ->withInput();
        }

        // --- VALIDACIÓN DE ATRIBUTOS OBLIGATORIOS ---
        $atributoFieldErrors = [];
        $faltantesPorArticulo = [];
        foreach ($validated['detalles'] as $idx => $detalle) {
            $art = Articulo::with('categorias')->find($detalle['articulo_id']);
            if ($art) {
                foreach ($art->categorias as $cat) {
                    if ($cat->obligatoria && empty($detalle['atributos'][$cat->id] ?? null)) {
                        $atributoFieldErrors["detalles.{$idx}.atributos.{$cat->id}"] = ' ';
                        $faltantesPorArticulo[$art->nombre][] = $cat->nombre;
                    }
                }
            }
        }
        if (! empty($atributoFieldErrors)) {
            $partes = [];
            foreach ($faltantesPorArticulo as $artNombre => $campos) {
                $partes[] = 'Falta completar '.implode(' y ', $campos).' del artículo '.$artNombre;
            }

            return back()->withErrors($atributoFieldErrors)->withInput()->with('error', implode('. ', $partes).'.');
        }
        // --- FIN VALIDACIÓN ---

        $data = $request->all();

        $faltanDatos =
            (empty($data['titular_id']) && empty($data['nuevo_titular'])) ||
            (empty($data['vehiculo_id']) && empty($data['nuevo_vehiculo']));

        if ($faltanDatos) {
            return back()
                ->withErrors(['titular_vehiculo' => 'Debe seleccionar o crear un titular y un vehículo antes de guardar la orden.'])
                ->withInput();
        }

        if (empty($data['vehiculo_id']) && ! empty($data['nuevo_vehiculo'])) {
            $erroresVehiculo = $this->validarVehiculoNuevo($data['nuevo_vehiculo']);

            if (! empty($erroresVehiculo)) {
                return back()->withErrors($erroresVehiculo)->withInput();
            }
        }

        $conFactura = array_key_exists('con_factura', $validated)
            ? (bool) $validated['con_factura']
            : (($validated['tipo_documento'] ?? 'OT') === 'FC');

        $orden = DB::transaction(function () use ($data, $validated, $conFactura) {
            if (empty($data['titular_id']) && ! empty($data['nuevo_titular'])) {
                $nuevoTitular = Titular::create([
                    'nombre' => $data['nuevo_titular']['nombre'] ?? '',
                    'apellido' => $data['nuevo_titular']['apellido'] ?? '',
                    'telefono' => $data['nuevo_titular']['telefono'] ?? '',
                    'email' => $data['nuevo_titular']['email'] ?? null,
                ]);
                $data['titular_id'] = $nuevoTitular->id;
            }

            if (empty($data['vehiculo_id']) && ! empty($data['nuevo_vehiculo'])) {
                $data['vehiculo_id'] = $this->crearVehiculoNuevo($data['nuevo_vehiculo'])->id;
            }

            $pivot = TitularVehiculo::firstOrCreate([
                'titular_id' => $data['titular_id'],
                'vehiculo_id' => $data['vehiculo_id'],
            ]);

            $prefix = $conFactura ? 'FC-' : 'OT-';
            $numeroCorrelativo = $this->generarNumeroOrden($prefix);

            $orden = OrdenDeTrabajo::create([
                'titular_vehiculo_id' => $pivot->id,
                'estado_id' => $validated['estado_id'],
                'asignado_a_id' => $validated['asignado_a_id'] ?? null,
                'completado_por_id' => $validated['completado_por_id'] ?? null,
                'fecha' => $validated['fecha'],
                'fecha_entrega_estimada' => $validated['fecha_entrega_estimada'],
                'numero_orden' => $numeroCorrelativo,
                'con_factura' => $conFactura,
                'es_garantia' => (bool) ($validated['es_garantia'] ?? false),
                'observacion' => $validated['observacion'] ?? null,
                'compania_seguro_id' => $validated['compania_seguro_id'] ?? null,
            ]);

            OrdenDeTrabajoHistorialEstado::create([
                'orden_de_trabajo_id' => $orden->id,
                'estado_id' => $orden->estado_id,
                'user_id' => auth()->id(),
            ]);

            foreach (($validated['pagos'] ?? []) as $pago) {
                $pagado = $pago['pagado'] ?? false;
                $bloqueado = $pagado;

                Precio::create([
                    'orden_de_trabajo_id' => $orden->id,
                    'medio_de_pago_id' => $pago['medio_de_pago_id'],
                    'valor' => $pago['monto'],
                    'monto_usd' => $pago['monto_usd'],
                    'tipo_cambio' => $pago['tipo_cambio'],
                    'fecha' => $pago['fecha'],
                    'pagado' => $pagado,
                    'bloqueado' => $bloqueado,
                    'movimiento_registrado' => false,
                    'observacion' => $pago['observacion'] ?? null,
                ]);
            }

            foreach (($validated['detalles'] ?? []) as $detalle) {
                $detalleCreado = DetalleOrdenDeTrabajo::create([
                    'orden_de_trabajo_id' => $orden->id,
                    'articulo_id' => $detalle['articulo_id'],
                    'marca_articulo_id' => $detalle['marca_articulo_id'] ?? null,
                    'descripcion' => $detalle['descripcion'] ?? null,
                    'valor' => $detalle['valor'] ?? 0,
                    'cantidad' => $detalle['cantidad'] ?? 1,
                    'colocacion_incluida' => $detalle['colocacion_incluida'] ?? false,
                ]);

                $atributos = $detalle['atributos'] ?? [];

                foreach ($atributos as $categoriaId => $subcategoriaId) {
                    if (empty($subcategoriaId)) {
                        continue;
                    }

                    $sc = Subcategoria::with('categoria')->find($subcategoriaId);
                    if (! $sc) {
                        continue;
                    }

                    DetalleOrdenAtributo::create([
                        'detalle_orden_de_trabajo_id' => $detalleCreado->id,
                        'categoria_id' => $sc->categoria_id,
                        'subcategoria_id' => $sc->id,
                    ]);
                }
            }

            return $orden;
        });

        // NUEVO: Procesar movimientos para pagos bloqueados
        $this->procesarPagosYMovimientos($orden);

        return redirect()
            ->route('ordenes.index')
            ->with('success', 'Orden creada correctamente ✅ (ID: '.$orden->id.')');
    }

    /*   public function show(OrdenDeTrabajo $orden)
       {
           $orden->load([
               'estado',
               'titularVehiculo.titular',
               'titularVehiculo.vehiculo',
               'detalles',
               'pagos.medioDePago',
           ]);

           return Inertia::render('ordenes/show', [
               'orden' => $orden,
               'userRoleId' => auth()->user()->role_id,
           ]);
       }*/

    public function pendientes(Request $request)
    {
        $ots = OrdenDeTrabajo::with([
            'estado',
            'titularVehiculo.titular',
            'titularVehiculo.vehiculo.marca',
            'titularVehiculo.vehiculo.modelo',
        ])
            ->whereIn('estado_id', Estado::idsParaTaller())
            ->when(Estado::idAnulada(), fn ($query, $estadoAnuladaId) => $query->where('estado_id', '!=', $estadoAnuladaId))
            ->when($request->filled('q'), function ($query) use ($request) {
                $q = $request->q;
                $query->where(function ($sub) use ($q) {
                    $sub->where('orden_de_trabajo.id', 'like', "%{$q}%")
                        ->orWhereHas('titularVehiculo.titular', function ($q2) use ($q) {
                            $q2->where('nombre', 'like', "%{$q}%")
                                ->orWhere('apellido', 'like', "%{$q}%");
                        })
                        ->orWhereHas('titularVehiculo.vehiculo', function ($q2) use ($q) {
                            $q2->where('patente', 'like', "%{$q}%");
                        });
                });
            })
            ->when(
                $request->filled('estado_id'),
                fn ($q) => $q->where('estado_id', $request->estado_id)
            )
            ->when(
                $request->filled('date_from'),
                fn ($q) => $q->whereDate('fecha', '>=', $request->date_from)
            )
            ->when(
                $request->filled('date_to'),
                fn ($q) => $q->whereDate('fecha', '<=', $request->date_to)
            )
            ->orderByDesc('orden_de_trabajo.id')
            ->get();

        $estados = Estado::select('id', 'nombre')
            ->whereIn('id', Estado::idsParaTaller())
            ->orderBy('id')
            ->get();

        $estadosCambio = Estado::select('id', 'nombre')
            ->whereIn('id', Estado::idsPermitidosCambioTaller())
            ->orderBy('id')
            ->get();

        return Inertia::render('taller/ordenes', [
            'ots' => $ots,
            'estados' => $estados,
            'estadosCambio' => $estadosCambio,
            'filters' => $request->only(['q', 'estado_id', 'date_from', 'date_to']),
        ]);
    }

    public function cambiarEstadoTaller(Request $request, OrdenDeTrabajo $orden)
    {
        if ($orden->estado()->where('nombre', Estado::NOMBRE_PAUSADA)->exists()) {
            return back()->withErrors(['estado_id' => 'La orden está pausada. Reanudala antes de cambiar su estado.']);
        }

        $estadosPermitidos = Estado::idsPermitidosCambioTaller();

        $request->validate([
            'estado_id' => ['required', 'integer', 'in:'.implode(',', $estadosPermitidos)],
        ]);

        // Actualiza el estado
        $orden->update([
            'estado_id' => $request->estado_id,
        ]);

        return redirect()->back()->with('success', 'Estado actualizado correctamente');
    }

    public function update(Request $request, OrdenDeTrabajo $orden)
    {
        abort_if($this->isTallerUser(), 403);

        if ($orden->estado()->where('nombre', Estado::NOMBRE_PAUSADA)->exists()) {
            return back()->withErrors(['error' => 'La orden está pausada y no puede modificarse hasta que sea reanudada.']);
        }

        $validated = $request->validate([
            'titular_id' => 'nullable|integer|exists:titular,id',
            'vehiculo_id' => 'nullable|integer|exists:vehiculo,id',
            'nuevo_titular' => 'nullable|array',
            'nuevo_titular.nombre' => 'required_without:titular_id|string|max:48',
            'nuevo_titular.apellido' => 'required_without:titular_id|string|max:48',
            'nuevo_titular.telefono' => 'nullable|string|max:20',
            'nuevo_titular.email' => 'nullable|email|max:48',
            'nuevo_vehiculo' => 'nullable|array',
            'nuevo_vehiculo.patente' => ['required_without:vehiculo_id', 'string', 'max:10', 'regex:/^(?:[A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/', 'unique:vehiculo,patente'],
            'nuevo_vehiculo.marca_id' => 'nullable|integer|exists:marcas,id',
            'nuevo_vehiculo.marca_nueva' => 'nullable|string|max:50',
            'nuevo_vehiculo.modelo_id' => 'nullable|integer|exists:modelos,id',
            'nuevo_vehiculo.modelo_nuevo' => 'nullable|string|max:50',
            'nuevo_vehiculo.anio' => 'nullable|integer|min:1900|max:'.date('Y'),
            'estado_id' => ['required', Rule::exists('estado', 'id')->where(fn ($query) => $query->where('nombre', '!=', Estado::NOMBRE_PAUSADA))],
            'asignado_a_id' => ['nullable', 'integer', 'exists:users,id'],
            'completado_por_id' => [Rule::requiredIf(fn () => Estado::whereKey($request->input('estado_id'))->whereIn('nombre', [Estado::NOMBRE_FINALIZADA, Estado::NOMBRE_RETIRADA])->exists()), 'nullable', 'integer', 'exists:users,id'],
            'fecha' => 'required|date',
            'observacion' => 'nullable|string|max:500',
            'con_factura' => 'required|boolean',
            'fecha_entrega_estimada' => 'nullable|date',
            'numero_orden' => 'nullable|string|max:50',
            'es_garantia' => 'nullable|boolean',
            'compania_seguro_id' => [
                'nullable',
                'integer',
                Rule::exists('companias_seguros', 'id')->whereNull('deleted_at')->where('activo', 1),
            ],
            'detalles' => 'required|array|min:1',
            'detalles.*.articulo_id' => 'required|integer|exists:articulos,id',
            'detalles.*.marca_articulo_id' => 'nullable|integer|exists:marcas_articulos,id',
            'detalles.*.descripcion' => 'nullable|string|max:255',
            'detalles.*.valor' => 'required|numeric|min:0',
            'detalles.*.cantidad' => 'required|integer|min:1',
            'detalles.*.colocacion_incluida' => 'boolean',
            'detalles.*.atributos' => 'nullable|array',
            'detalles.*.atributos.*' => 'nullable|integer|exists:subcategorias,id',
            'pagos' => 'required|array|min:1',
            'pagos.*.id' => 'nullable|integer',
            'pagos.*.medio_de_pago_id' => 'required|exists:medio_de_pago,id',
            'pagos.*.monto' => 'required|numeric',
            'pagos.*.fecha' => 'required|date',
            'pagos.*.pagado' => 'required|boolean',
            'pagos.*.bloqueado' => 'nullable|boolean',
            'pagos.*.observacion' => 'nullable|string|max:255',
            'pagos.*.monto_usd' => 'nullable|numeric',
            'pagos.*.tipo_cambio' => 'nullable|numeric|gt:0',
        ], [
            'completado_por_id.required' => 'Seleccioná quién completó el trabajo.',
            'completado_por_id.exists' => 'La persona seleccionada no existe.',
            'asignado_a_id.exists' => 'La persona asignada no existe.',
        ]);

        $validated['pagos'] = $this->normalizarPagos($validated['pagos']);

        $totalOrden = collect($validated['detalles'])->reduce(function ($acc, $detalle) {
            return $acc + (floatval($detalle['valor']) * intval($detalle['cantidad']));
        }, 0);

        // --- NUEVA VALIDACIÓN DE ESTADO FINALIZADA ---
        $estadoFinalizada = Estado::whereIn('nombre', [Estado::NOMBRE_FINALIZADA, Estado::NOMBRE_RETIRADA])->where('id', $validated['estado_id'])->first();

        if ($estadoFinalizada && (int) $validated['estado_id'] === $estadoFinalizada->id) {
            // Calculamos lo que ya está pagado (incluyendo los que se están enviando ahora como pagados)
            $totalPagado = collect($validated['pagos'])
                ->where('pagado', true)
                ->sum('monto');

            if ($totalPagado < $totalOrden) {
                $falta = $totalOrden - $totalPagado;

                return back()
                    ->withErrors(['estado_id' => 'No se puede finalizar o retirar la OT: El saldo pendiente es de $'.number_format($falta, 2)])
                    ->withInput();
            }
        }
        // --- FIN DE VALIDACIÓN ---

        if ($totalOrden <= 0) {
            // ... (resto del código)
            return back()
                ->withErrors(['detalles' => 'El total de la orden debe ser mayor a $0.'])
                ->withInput();
        }

        $data = $request->all();

        $faltanDatos =
            (empty($data['titular_id']) && empty($data['nuevo_titular'])) ||
            (empty($data['vehiculo_id']) && empty($data['nuevo_vehiculo']));

        if ($faltanDatos) {
            return back()
                ->withErrors(['titular_vehiculo' => 'Debe seleccionar o crear un titular y un vehículo antes de guardar la orden.'])
                ->withInput();
        }

        if (empty($data['vehiculo_id']) && ! empty($data['nuevo_vehiculo'])) {
            $erroresVehiculo = $this->validarVehiculoNuevo($data['nuevo_vehiculo']);

            if (! empty($erroresVehiculo)) {
                return back()->withErrors($erroresVehiculo)->withInput();
            }
        }

        DB::transaction(function () use ($validated, $data, $orden) {
            $estadoAnterior = (int) $orden->estado_id;

            if (empty($data['titular_id']) && ! empty($data['nuevo_titular'])) {
                $nuevoTitular = Titular::create([
                    'nombre' => $data['nuevo_titular']['nombre'] ?? '',
                    'apellido' => $data['nuevo_titular']['apellido'] ?? '',
                    'telefono' => $data['nuevo_titular']['telefono'] ?? '',
                    'email' => $data['nuevo_titular']['email'] ?? null,
                ]);
                $data['titular_id'] = $nuevoTitular->id;
            }

            if (empty($data['vehiculo_id']) && ! empty($data['nuevo_vehiculo'])) {
                $data['vehiculo_id'] = $this->crearVehiculoNuevo($data['nuevo_vehiculo'])->id;
            }

            $pivot = TitularVehiculo::firstOrCreate([
                'titular_id' => $data['titular_id'],
                'vehiculo_id' => $data['vehiculo_id'],
            ]);

            $conFacturaFinal = (bool) $validated['con_factura'];
            $prefixFinal = $conFacturaFinal ? 'FC-' : 'OT-';
            $numeroCorrelativo = $orden->numero_orden;

            if (! $numeroCorrelativo || ! str_starts_with($numeroCorrelativo, $prefixFinal)) {
                $numeroCorrelativo = $this->generarNumeroOrden($prefixFinal);
            }

            $orden->update([
                'titular_vehiculo_id' => $pivot->id,
                'estado_id' => $validated['estado_id'],
                'asignado_a_id' => array_key_exists('asignado_a_id', $validated) ? $validated['asignado_a_id'] : $orden->asignado_a_id,
                'completado_por_id' => array_key_exists('completado_por_id', $validated) ? $validated['completado_por_id'] : $orden->completado_por_id,
                'fecha' => $validated['fecha'],
                'observacion' => $validated['observacion'] ?? null,
                'con_factura' => $conFacturaFinal,
                'fecha_entrega_estimada' => $validated['fecha_entrega_estimada'] ?? null,
                'numero_orden' => $numeroCorrelativo,
                'es_garantia' => (bool) ($validated['es_garantia'] ?? false),
                'compania_seguro_id' => $validated['compania_seguro_id'] ?? null,
            ]);

            if ($estadoAnterior !== (int) $orden->estado_id) {
                OrdenDeTrabajoHistorialEstado::create([
                    'orden_de_trabajo_id' => $orden->id,
                    'estado_id' => $orden->estado_id,
                    'user_id' => auth()->id(),
                ]);
            }

            // --- VALIDACIÓN DE ATRIBUTOS OBLIGATORIOS ---
            $atributoFieldErrors = [];
            $faltantesPorArticulo = [];
            foreach ($validated['detalles'] as $idx => $detalle) {
                $art = Articulo::with('categorias')->find($detalle['articulo_id']);
                if ($art) {
                    foreach ($art->categorias as $cat) {
                        if ($cat->obligatoria && empty($detalle['atributos'][$cat->id] ?? null)) {
                            $atributoFieldErrors["detalles.{$idx}.atributos.{$cat->id}"] = ' ';
                            $faltantesPorArticulo[$art->nombre][] = $cat->nombre;
                        }
                    }
                }
            }
            if (! empty($atributoFieldErrors)) {
                $partes = [];
                foreach ($faltantesPorArticulo as $artNombre => $campos) {
                    $partes[] = 'Falta completar '.implode(' y ', $campos).' del artículo '.$artNombre;
                }

                return back()->withErrors($atributoFieldErrors)->withInput()->with('error', implode('. ', $partes).'.');
            }
            // --- FIN VALIDACIÓN ---

            foreach ($orden->detalles as $det) {
                if (method_exists($det, 'atributos')) {
                    $det->atributos()->delete();
                } else {
                    DetalleOrdenAtributo::where('detalle_orden_de_trabajo_id', $det->id)->delete();
                }
            }

            $orden->detalles()->delete();

            foreach ($validated['detalles'] as $d) {
                $detalleCreado = DetalleOrdenDeTrabajo::create([
                    'orden_de_trabajo_id' => $orden->id,
                    'articulo_id' => $d['articulo_id'],
                    'marca_articulo_id' => $d['marca_articulo_id'] ?? null,
                    'descripcion' => $d['descripcion'] ?? null,
                    'valor' => $d['valor'],
                    'cantidad' => $d['cantidad'],
                    'colocacion_incluida' => $d['colocacion_incluida'] ?? false,
                ]);

                $atributos = $d['atributos'] ?? [];
                foreach ($atributos as $categoriaId => $subcategoriaId) {
                    if (empty($subcategoriaId)) {
                        continue;
                    }

                    $sc = Subcategoria::with('categoria')->find($subcategoriaId);
                    if (! $sc) {
                        continue;
                    }

                    DetalleOrdenAtributo::create([
                        'detalle_orden_de_trabajo_id' => $detalleCreado->id,
                        'categoria_id' => $sc->categoria_id,
                        'subcategoria_id' => $sc->id,
                    ]);
                }
            }

            // ACTUALIZAR PAGOS - NO TOCAR LOS BLOQUEADOS
            $pagosBloqueados = $orden->pagos()
                ->where('bloqueado', true)
                ->pluck('id')
                ->toArray();

            $orden->pagos()
                ->whereNotIn('id', $pagosBloqueados)
                ->delete();

            foreach ($validated['pagos'] as $pago) {
                $pagoId = $pago['id'] ?? null;

                if ($pagoId && in_array($pagoId, $pagosBloqueados)) {
                    continue;
                }

                $pagado = $pago['pagado'] ?? false;
                $bloqueado = $pagado;

                Precio::create([
                    'orden_de_trabajo_id' => $orden->id,
                    'medio_de_pago_id' => $pago['medio_de_pago_id'],
                    'valor' => $pago['monto'],
                    'monto_usd' => $pago['monto_usd'],
                    'tipo_cambio' => $pago['tipo_cambio'],
                    'fecha' => $pago['fecha'],
                    'pagado' => $pagado,
                    'bloqueado' => $bloqueado,
                    'movimiento_registrado' => false,
                    'observacion' => $pago['observacion'] ?? null,
                ]);
            }
        });

        // NUEVO: Procesar movimientos para pagos bloqueados
        $this->procesarPagosYMovimientos($orden);

        return redirect()
            ->route('ordenes.show', $orden->id)
            ->with('success', 'Orden actualizada correctamente ✅');
    }

    /**
     * En pagos en dólares exige monto en USD y tipo de cambio, y calcula el
     * equivalente en pesos, que es el que se usa en totales y movimientos.
     */
    private function normalizarPagos(array $pagos): array
    {
        $mediosEnDolares = Dolares::idsMediosEnDolares();
        $errores = [];

        foreach ($pagos as $i => $pago) {
            $pagos[$i] = array_merge($pago, Dolares::normalizar(
                in_array((int) $pago['medio_de_pago_id'], $mediosEnDolares, true),
                $pago['monto_usd'] ?? null,
                $pago['tipo_cambio'] ?? null,
                $pago['monto'],
                "pagos.{$i}.",
                $errores,
            ));
        }

        if (! empty($errores)) {
            throw ValidationException::withMessages($errores);
        }

        return $pagos;
    }

    /**
     * Procesa los pagos bloqueados y crea los movimientos correspondientes
     */
    private function procesarPagosYMovimientos(OrdenDeTrabajo $orden): void
    {
        try {
            $orden = $orden->fresh(['pagos']);
            $pagos = $orden->pagos ?? collect();

            if ($pagos->isEmpty()) {
                Log::info("La OT #{$orden->id} no tiene pagos registrados.");

                return;
            }

            foreach ($pagos as $pago) {
                // Solo procesar pagos bloqueados que NO tengan movimiento registrado
                if ($pago->bloqueado && ! $pago->movimiento_registrado) {

                    $monto = (float) $pago->valor;

                    // Determinar tipo y concepto según el signo del monto
                    if ($monto >= 0) {
                        $tipo = Movimiento::TIPO_INGRESO;
                        $montoParaGuardar = $monto;
                        $conceptoId = 3; // Cobro a clientes
                    } else {
                        $tipo = Movimiento::TIPO_EGRESO;
                        $montoParaGuardar = abs($monto);
                        $conceptoId = 7; // Ajuste de cobro
                    }

                    // Crear el movimiento
                    Movimiento::create([
                        'fecha' => now(),
                        'monto' => $montoParaGuardar,
                        'monto_usd' => $pago->monto_usd !== null ? abs((float) $pago->monto_usd) : null,
                        'tipo_cambio' => $pago->tipo_cambio,
                        'concepto_id' => $conceptoId,
                        'medio_de_pago_id' => $pago->medio_de_pago_id,
                        'comprobante' => "OT-{$orden->id}",
                        'tipo' => $tipo,
                        'orden_de_trabajo_id' => $orden->id,
                    ]);

                    // Marcar como registrado
                    $pago->update(['movimiento_registrado' => true]);

                    Log::info("Movimiento de {$tipo} creado para pago ID {$pago->id} de OT #{$orden->id} - Monto: {$monto}");
                }
            }

        } catch (\Exception $e) {
            Log::error("Error al procesar pagos de OT #{$orden->id}: ".$e->getMessage());
            throw $e;
        }
    }

    public function pausar(Request $request, OrdenDeTrabajo $orden)
    {
        $validated = $request->validate([
            'motivo' => ['nullable', 'string', 'max:500'],
        ], [
            'motivo.max' => 'El motivo no puede superar los :max caracteres.',
        ]);

        $motivo = trim((string) ($validated['motivo'] ?? ''));
        $motivo = $motivo !== '' ? $motivo : null;

        DB::transaction(function () use ($orden, $motivo) {
            $ordenBloqueada = OrdenDeTrabajo::query()
                ->with('estado')
                ->lockForUpdate()
                ->findOrFail($orden->id);

            if ($ordenBloqueada->estado?->nombre === Estado::NOMBRE_PAUSADA) {
                throw ValidationException::withMessages([
                    'estado' => 'La orden ya está pausada.',
                ]);
            }

            if (Estado::esFinal($ordenBloqueada->estado?->nombre)) {
                throw ValidationException::withMessages([
                    'estado' => 'No se puede pausar una orden que se encuentra en un estado final.',
                ]);
            }

            $estadoPausadaId = Estado::idPausada();
            if (! $estadoPausadaId) {
                throw ValidationException::withMessages([
                    'estado' => 'El estado Pausada no está configurado en el sistema.',
                ]);
            }

            $ordenBloqueada->update([
                'estado_previo_pausa_id' => $ordenBloqueada->estado_id,
                'estado_id' => $estadoPausadaId,
            ]);

            OrdenDeTrabajoHistorialEstado::create([
                'orden_de_trabajo_id' => $ordenBloqueada->id,
                'estado_id' => $estadoPausadaId,
                'user_id' => auth()->id(),
                'motivo' => $motivo,
            ]);
        });

        return back()->with('success', "Orden #{$orden->id} pausada correctamente.");
    }

    public function reanudar(OrdenDeTrabajo $orden)
    {
        DB::transaction(function () use ($orden) {
            $ordenBloqueada = OrdenDeTrabajo::query()
                ->with('estado')
                ->lockForUpdate()
                ->findOrFail($orden->id);

            if ($ordenBloqueada->estado?->nombre !== Estado::NOMBRE_PAUSADA) {
                throw ValidationException::withMessages([
                    'estado' => 'La orden no está pausada.',
                ]);
            }

            $estadoPrevio = Estado::find($ordenBloqueada->estado_previo_pausa_id);
            if (! $estadoPrevio || $estadoPrevio->nombre === Estado::NOMBRE_PAUSADA) {
                throw ValidationException::withMessages([
                    'estado' => 'No se pudo determinar el estado anterior de la orden.',
                ]);
            }

            $ordenBloqueada->update([
                'estado_id' => $estadoPrevio->id,
                'estado_previo_pausa_id' => null,
            ]);

            OrdenDeTrabajoHistorialEstado::create([
                'orden_de_trabajo_id' => $ordenBloqueada->id,
                'estado_id' => $estadoPrevio->id,
                'user_id' => auth()->id(),
            ]);
        });

        return back()->with('success', "Orden #{$orden->id} reanudada correctamente.");
    }

    public function show(OrdenDeTrabajo $orden)
    {
        $user = auth()->user();
        $isTallerUser = $this->isTallerUser($user);
        $canViewFinancialAmounts = $user?->hasCapability(RoleCapabilities::VIEW_FINANCIAL_AMOUNTS) ?? false;

        if ($isTallerUser && Estado::idAnulada() !== null && (int) $orden->estado_id === Estado::idAnulada()) {
            return redirect()
                ->route('taller.ots')
                ->with('error', 'Las OTs anuladas no estÃ¡n disponibles para taller.');
        }

        $orden->load([
            'titularVehiculo.titular',
            'titularVehiculo.vehiculo.marca',
            'titularVehiculo.vehiculo.modelo',
            'estado',
            'detalles.articulo',
            'detalles.marcaArticulo',
            'detalles.atributos.categoria',
            'detalles.atributos.subcategoria',
            'pagos.medioDePago',
            'companiaSeguro',
            'asignadoA:id,name',
            'completadoPor:id,name',
            'historialEstados.estado',
            'historialEstados.user',
        ]);

        $totalOrden = $orden->detalles->reduce(function ($acc, $detalle) {
            return $acc + ($detalle->valor * $detalle->cantidad);
        }, 0);

        $totalPagado = $orden->pagos->where('pagado', true)->reduce(function ($acc, $pago) {
            return $acc + $pago->valor;
        }, 0);

        $totalRegistrado = $orden->pagos->reduce(function ($acc, $pago) {
            return $acc + $pago->valor;
        }, 0);

        if (! $canViewFinancialAmounts) {
            $orden->setRelation('detalles', $orden->detalles->map(function ($detalle) {
                $detalle->valor = null;

                return $detalle;
            }));

            $orden->setRelation('pagos', $orden->pagos->map(function ($pago) {
                $pago->valor = null;
                $pago->monto_usd = null;
                $pago->tipo_cambio = null;

                return $pago;
            }));

            $totalOrden = null;
            $totalPagado = null;
            $totalRegistrado = null;
        }

        return Inertia::render('ordenes/show', [
            'orden' => $orden,
            'totalOrden' => $totalOrden !== null ? (float) $totalOrden : null,
            'totalPagado' => $totalPagado !== null ? (float) $totalPagado : null,
            'totalRegistrado' => $totalRegistrado !== null ? (float) $totalRegistrado : null,
            'saldoPendiente' => $totalOrden !== null && $totalPagado !== null ? (float) ($totalOrden - $totalPagado) : null,
            'userRoleId' => auth()->user()->role_id,
        ]);
    }

    public function edit(OrdenDeTrabajo $orden)
    {
        if ($this->isTallerUser()) {
            return redirect()->route('taller.ordenes.show', $orden);
        }

        if ($orden->estado()->where('nombre', Estado::NOMBRE_PAUSADA)->exists()) {
            return redirect()
                ->route('ordenes.show', $orden)
                ->with('error', 'La orden está pausada y sólo puede consultarse o reanudarse.');
        }

        $orden->load([
            'estado',
            'titularVehiculo.titular',
            'titularVehiculo.vehiculo.marca',
            'titularVehiculo.vehiculo.modelo',
            'detalles.marcaArticulo',
            'detalles.atributos',
            'pagos.medioDePago',
            'companiaSeguro',
        ]);

        $titulares = Titular::with([
            'vehiculos' => function ($query) {
                $query->select('vehiculo.id', 'patente', 'marca_id', 'modelo_id', 'anio')
                    ->with(['marca:id,nombre', 'modelo:id,nombre']);
            },
        ])
            ->select('id', 'nombre', 'apellido', 'telefono', 'email')
            ->get();

        $articulos = Articulo::with(['categorias.subcategorias'])
            ->select('id', 'nombre')
            ->get();

        $companiasSeguros = CompaniaSeguro::select('id', 'nombre')
            ->where('activo', true)
            ->orderBy('nombre')
            ->get();

        $estados = Estado::select('id', 'nombre')
            ->where('nombre', '!=', Estado::NOMBRE_PAUSADA)
            ->orderBy('nombre')
            ->get();
        $mediosDePago = MedioDePago::select('id', 'nombre', 'moneda')->orderBy('nombre')->get();
        $marcasArticulos = MarcaArticulo::select('id', 'nombre')->orderBy('nombre')->get();

        return Inertia::render('ordenes/edit', [
            'orden' => $orden,
            'titulares' => $titulares,
            'articulos' => $articulos,
            'companiasSeguros' => $companiasSeguros,
            'estados' => $estados,
            'usuarios' => User::orderBy('name')->get(['id', 'name']),
            'mediosDePago' => $mediosDePago,
            'marcasArticulos' => $marcasArticulos,
        ]);
    }

    public function destroy(Request $request, OrdenDeTrabajo $orden)
    {
        abort_if($this->isTallerUser(), 403);

        if ($orden->estado()->where('nombre', Estado::NOMBRE_PAUSADA)->exists()) {
            return back()->withErrors(['error' => 'La orden está pausada. Reanudala antes de anularla.']);
        }

        $estadoAnulada = Estado::where('nombre', 'Anulada')->first();

        if (! $estadoAnulada) {
            return back()->withErrors(['error' => 'No se encontró el estado "Anulada" en el sistema.']);
        }

        if ((int) $orden->estado_id === $estadoAnulada->id) {
            return back()->withErrors(['error' => 'Esta orden ya fue anulada.']);
        }

        $validated = $request->validate([
            'motivo' => ['required', 'string', 'min:5', 'max:500'],
        ], [
            'motivo.required' => 'Tenés que indicar el motivo de la anulación.',
            'motivo.min' => 'El motivo debe tener al menos :min caracteres.',
            'motivo.max' => 'El motivo no puede superar los :max caracteres.',
        ]);

        $motivo = trim($validated['motivo']);

        DB::transaction(function () use ($orden, $estadoAnulada, $motivo) {
            // 1) Buscar movimientos de ingreso vinculados a esta OT
            $ingresosExistentes = Movimiento::where('orden_de_trabajo_id', $orden->id)
                ->where('tipo', Movimiento::TIPO_INGRESO)
                ->get();

            // 2) Si existen ingresos, generar egresos de reversa
            if ($ingresosExistentes->isNotEmpty()) {
                $conceptoAnulacion = Concepto::where('nombre', 'Anulación OT')->first();

                foreach ($ingresosExistentes as $ingreso) {
                    Movimiento::create([
                        'fecha' => now(),
                        'monto' => $ingreso->monto,
                        'monto_usd' => $ingreso->monto_usd,
                        'tipo_cambio' => $ingreso->tipo_cambio,
                        'concepto_id' => $conceptoAnulacion->id,
                        'medio_de_pago_id' => $ingreso->medio_de_pago_id,
                        'tipo' => Movimiento::TIPO_EGRESO,
                        'orden_de_trabajo_id' => $orden->id,
                    ]);
                }

                Log::info("Movimientos de reversa generados para OT #{$orden->id}: {$ingresosExistentes->count()} egresos.");
            }

            // 3) Cambiar estado a "Anulada"
            $orden->update(['estado_id' => $estadoAnulada->id]);

            // 4) Registrar en historial de estados
            OrdenDeTrabajoHistorialEstado::create([
                'orden_de_trabajo_id' => $orden->id,
                'estado_id' => $estadoAnulada->id,
                'user_id' => auth()->id(),
                'motivo' => $motivo,
            ]);
        });

        return redirect()
            ->route('ordenes.index')
            ->with('success', "Orden #{$orden->id} anulada correctamente ✅");
    }

    private function isTallerUser($user = null): bool
    {
        $user ??= auth()->user();

        return (int) ($user?->role_id ?? 0) === 3;
    }

    /**
     * Genera un número correlativo único para las órdenes de trabajo.
     */
    private function generarNumeroOrden(string $prefix): string
    {
        $lastOrder = OrdenDeTrabajo::whereRaw("numero_orden REGEXP '^".$prefix."[0-9]+$'")
            ->lockForUpdate()
            ->orderByRaw('CAST(SUBSTRING(numero_orden, '.(strlen($prefix) + 1).') AS UNSIGNED) DESC')
            ->first();

        $newNumber = 1;
        if ($lastOrder && preg_match('/^'.preg_quote($prefix, '/').'(\d+)$/', $lastOrder->numero_orden, $matches)) {
            $newNumber = (int) $matches[1] + 1;
        }

        $numeroCorrelativo = $prefix.str_pad($newNumber, 6, '0', STR_PAD_LEFT);

        // Garantía anti-colisión: Incrementar si ya existe en la BD
        while (OrdenDeTrabajo::where('numero_orden', $numeroCorrelativo)->exists()) {
            $newNumber++;
            $numeroCorrelativo = $prefix.str_pad($newNumber, 6, '0', STR_PAD_LEFT);
        }

        return $numeroCorrelativo;
    }

    /**
     * Valida los datos de un vehículo nuevo. La marca y el modelo pueden venir
     * del catálogo (marca_id / modelo_id) o escritos a mano (marca_nueva / modelo_nuevo).
     *
     * @return array<string, string> Errores por campo (vacío si está todo bien)
     */
    private function validarVehiculoNuevo(array $nuevoVehiculo): array
    {
        $errores = [];

        if (trim((string) ($nuevoVehiculo['patente'] ?? '')) === '') {
            $errores['nuevo_vehiculo.patente'] = 'Ingresá la patente del vehículo.';
        }

        if (empty($nuevoVehiculo['marca_id']) && trim((string) ($nuevoVehiculo['marca_nueva'] ?? '')) === '') {
            $errores['nuevo_vehiculo.marca_id'] = 'Seleccioná una marca o escribí una nueva.';
        }

        if (empty($nuevoVehiculo['modelo_id']) && trim((string) ($nuevoVehiculo['modelo_nuevo'] ?? '')) === '') {
            $errores['nuevo_vehiculo.modelo_id'] = 'Seleccioná un modelo o escribí uno nuevo.';
        }

        return $errores;
    }

    /**
     * Crea el vehículo dando de alta la marca y el modelo si todavía no existen.
     */
    private function crearVehiculoNuevo(array $nuevoVehiculo): Vehiculo
    {
        $marcaId = $nuevoVehiculo['marca_id'] ?? null;
        $marcaNueva = trim((string) ($nuevoVehiculo['marca_nueva'] ?? ''));

        if (empty($marcaId) && $marcaNueva !== '') {
            $marcaId = Marca::firstOrCreate(['nombre' => $marcaNueva])->id;
        }

        $modeloId = $nuevoVehiculo['modelo_id'] ?? null;
        $modeloNuevo = trim((string) ($nuevoVehiculo['modelo_nuevo'] ?? ''));

        if (empty($modeloId) && $modeloNuevo !== '' && $marcaId) {
            $modeloId = Modelo::firstOrCreate([
                'marca_id' => $marcaId,
                'nombre' => $modeloNuevo,
            ])->id;
        }

        // El modelo siempre tiene que pertenecer a la marca elegida
        if ($modeloId && $marcaId && ! Modelo::where('id', $modeloId)->where('marca_id', $marcaId)->exists()) {
            $modeloId = null;
        }

        return Vehiculo::create([
            'patente' => strtoupper(trim((string) $nuevoVehiculo['patente'])),
            'marca_id' => $marcaId ? (int) $marcaId : null,
            'modelo_id' => $modeloId ? (int) $modeloId : null,
            'anio' => $nuevoVehiculo['anio'] ?? null,
        ]);
    }
}
