import { Car, Plus, Check, X, Sparkles, FolderPlus } from "lucide-react";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import { toast } from "react-hot-toast";
import DeleteButton from "@/components/botones/boton-eliminar";
import { getPatenteError, normalizePatente } from "@/utils/patente";
import { ordenarPorEtiqueta } from "@/lib/utils";

interface Vehiculo {
  id: number;
  patente: string;
  marca_id: number;
  modelo_id: number;
  anio: number;
  marca?: { id: number; nombre: string };
  modelo?: { id: number; nombre: string };
}

interface Marca {
  id: number;
  nombre: string;
}

interface Modelo {
  id: number;
  marca_id: number;
  nombre: string;
}

interface Props {
  vehiculos: Vehiculo[];
  formData: any;
  setFormData: (data: any) => void;
}

export interface VehiculoSectionRef {
  validate: () => boolean;
}

const VEHICULO_VACIO = {
  patente: "",
  marca_id: null as number | null,
  marca_nueva: "",
  modelo_id: null as number | null,
  modelo_nuevo: "",
  anio: new Date().getFullYear(),
};

const MAX_NOMBRE = 50;

type OpcionCatalogo = {
  value: number | null;
  label: string;
  __isNew__?: boolean;
};

const tieneMarca = (v: { marca_id: number | null; marca_nueva?: string }) =>
  Boolean(v.marca_id) || Boolean(v.marca_nueva?.trim());

const tieneModelo = (v: { modelo_id: number | null; modelo_nuevo?: string }) =>
  Boolean(v.modelo_id) || Boolean(v.modelo_nuevo?.trim());

const VehiculoSection = forwardRef<VehiculoSectionRef, Props>(
  ({ vehiculos, formData, setFormData }, ref) => {
    const [showNew, setShowNew] = useState(false);
    const [marcas, setMarcas] = useState<Marca[]>([]);
    const [modelos, setModelos] = useState<Modelo[]>([]);
    const [todosLosVehiculos, setTodosLosVehiculos] = useState<Vehiculo[]>([]);
    const [nuevoVehiculo, setNuevoVehiculo] = useState({ ...VEHICULO_VACIO });
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

    // Modales de alta rápida para catálogo
    const [showModalMarca, setShowModalMarca] = useState(false);
    const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState("");
    const [isSavingMarca, setIsSavingMarca] = useState(false);

    const [showModalModelo, setShowModalModelo] = useState(false);
    const [nuevoModeloNombre, setNuevoModeloNombre] = useState("");
    const [isSavingModelo, setIsSavingModelo] = useState(false);

    // Cargar marcas al montar el componente
    useEffect(() => {
      axios.get('/api/marcas')
        .then(response => setMarcas(response.data))
        .catch(error => console.error('Error cargando marcas:', error));

      axios.get('/api/vehiculos')
        .then(response => setTodosLosVehiculos(response.data))
        .catch(error => console.error('Error cargando todos los vehículos:', error));
    }, []);

    // Cargar modelos cuando cambia la marca seleccionada
    useEffect(() => {
      if (nuevoVehiculo.marca_id) {
        axios.get(`/api/modelos/${nuevoVehiculo.marca_id}`)
          .then(response => setModelos(response.data))
          .catch(error => console.error('Error cargando modelos:', error));
      } else {
        setModelos([]);
        setNuevoVehiculo(prev => ({ ...prev, modelo_id: null }));
      }
    }, [nuevoVehiculo.marca_id]);

    useImperativeHandle(ref, () => ({
      validate: () => {
        const errs: Record<string, string> = {};
        if (!formData.vehiculo_id && !formData.nuevo_vehiculo) {
          errs.general = "Debes seleccionar o crear un vehículo.";
        } else if (formData.nuevo_vehiculo) {
          const v = formData.nuevo_vehiculo;
          const patenteError = getPatenteError(v.patente ?? "");
          if (patenteError) {
            errs["nuevo_vehiculo.patente"] = patenteError;
            toast.error(patenteError);
          }
          if (!tieneMarca(v)) errs["nuevo_vehiculo.marca_id"] = "La marca es obligatoria.";
          if (!tieneModelo(v)) errs["nuevo_vehiculo.modelo_id"] = "El modelo es obligatorio.";
        }
        setLocalErrors(errs);
        return Object.keys(errs).length === 0;
      },
    }));

    // Función para crear marca directamente y persistirla en catálogo
    const handleCrearMarcaDirecta = async (nombreInput: string): Promise<Marca | null> => {
      const nombre = nombreInput.trim();
      if (!nombre) {
        toast.error("Ingresá el nombre de la marca.");
        return null;
      }

      setIsSavingMarca(true);
      try {
        const res = await axios.post<Marca>('/api/marcas', { nombre });
        const marcaCreada = res.data;

        setMarcas(prev => {
          if (prev.some(m => m.id === marcaCreada.id)) return prev;
          return [...prev, marcaCreada];
        });

        setNuevoVehiculo(prev => ({
          ...prev,
          marca_id: marcaCreada.id,
          marca_nueva: "",
          modelo_id: null,
          modelo_nuevo: "",
        }));

        setLocalErrors(prev => {
          const u = { ...prev };
          delete u.marca_id;
          return u;
        });

        toast.success(`Marca "${marcaCreada.nombre}" agregada al catálogo de vehículos.`);
        setShowModalMarca(false);
        setNuevaMarcaNombre("");
        return marcaCreada;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data?.errors?.nombre?.[0] || "Error al crear la marca";
        toast.error(msg);
        return null;
      } finally {
        setIsSavingMarca(false);
      }
    };

    // Función para crear modelo directamente y persistirlo en catálogo
    const handleCrearModeloDirecto = async (nombreInput: string, customMarcaId?: number): Promise<Modelo | null> => {
      const nombre = nombreInput.trim();
      if (!nombre) {
        toast.error("Ingresá el nombre del modelo.");
        return null;
      }

      const targetMarcaId = customMarcaId || nuevoVehiculo.marca_id;
      if (!targetMarcaId) {
        toast.error("Seleccioná o creá una marca antes de agregar un modelo.");
        return null;
      }

      setIsSavingModelo(true);
      try {
        const res = await axios.post<Modelo>('/api/modelos', {
          marca_id: targetMarcaId,
          nombre,
        });
        const modeloCreado = res.data;

        setModelos(prev => {
          if (prev.some(m => m.id === modeloCreado.id)) return prev;
          return [...prev, modeloCreado];
        });

        setNuevoVehiculo(prev => ({
          ...prev,
          marca_id: targetMarcaId,
          modelo_id: modeloCreado.id,
          modelo_nuevo: "",
        }));

        setLocalErrors(prev => {
          const u = { ...prev };
          delete u.modelo_id;
          return u;
        });

        toast.success(`Modelo "${modeloCreado.nombre}" agregado al catálogo de vehículos.`);
        setShowModalModelo(false);
        setNuevoModeloNombre("");
        return modeloCreado;
      } catch (err: any) {
        const msg = err.response?.data?.message || err.response?.data?.errors?.nombre?.[0] || "Error al crear el modelo";
        toast.error(msg);
        return null;
      } finally {
        setIsSavingModelo(false);
      }
    };

    // Opciones para el selector de vehículos existentes
    const titularIds = new Set(vehiculos.map(v => v.id));
    const vehiculosTitularOptions = ordenarPorEtiqueta(
      vehiculos.map((v) => ({
        value: v.id,
        label: `${v.patente} — ${v.marca?.nombre || 'Sin marca'} ${v.modelo?.nombre || 'Sin modelo'} (${v.anio || '-'})`,
        patente: v.patente,
        marca: v.marca?.nombre || '',
        modelo: v.modelo?.nombre || '',
        anio: v.anio,
      })),
      (o) => o.label
    );

    const otrosVehiculosOptions = ordenarPorEtiqueta(
      todosLosVehiculos
        .filter(v => !titularIds.has(v.id))
        .map((v) => ({
          value: v.id,
          label: `${v.patente} — ${v.marca?.nombre || 'Sin marca'} ${v.modelo?.nombre || 'Sin modelo'} (${v.anio || '-'}) [General]`,
          patente: v.patente,
          marca: v.marca?.nombre || '',
          modelo: v.modelo?.nombre || '',
          anio: v.anio,
        })),
      (o) => o.label
    );

    const options = [
      ...(vehiculosTitularOptions.length > 0
        ? [{ label: "Vehículos del cliente", options: vehiculosTitularOptions }]
        : []),
      ...(otrosVehiculosOptions.length > 0
        ? [{ label: "Otros vehículos registrados", options: otrosVehiculosOptions }]
        : []),
    ];

    const flatOptions = [...vehiculosTitularOptions, ...otrosVehiculosOptions];

    // Opciones para selector de marcas
    const marcaOptions: OpcionCatalogo[] = ordenarPorEtiqueta(
      marcas.map(m => ({
        value: m.id,
        label: m.nombre
      })),
      (o) => o.label
    );

    // Opciones para selector de modelos
    const modeloOptions: OpcionCatalogo[] = ordenarPorEtiqueta(
      modelos.map(m => ({
        value: m.id,
        label: m.nombre
      })),
      (o) => o.label
    );

    // Valor mostrado: opción del catálogo, o la marca/modelo tipeada a mano
    const marcaValue: OpcionCatalogo | null = nuevoVehiculo.marca_id
      ? marcaOptions.find(opt => opt.value === nuevoVehiculo.marca_id) || null
      : nuevoVehiculo.marca_nueva
        ? { value: null, label: nuevoVehiculo.marca_nueva }
        : null;

    const modeloValue: OpcionCatalogo | null = nuevoVehiculo.modelo_id
      ? modeloOptions.find(opt => opt.value === nuevoVehiculo.modelo_id) || null
      : nuevoVehiculo.modelo_nuevo
        ? { value: null, label: nuevoVehiculo.modelo_nuevo }
        : null;

    // Validación para react-select creatable
    const esNombreValido = (input: string, _seleccion: unknown, opciones: readonly unknown[]) => {
      const nombre = input.trim();
      if (!nombre || nombre.length > MAX_NOMBRE) return false;
      return !opciones.some(
        (o) => String((o as OpcionCatalogo).label).toLowerCase() === nombre.toLowerCase()
      );
    };

    const formatCreateLabelMarca = (input: string) => `➕ Agregar "${input.trim()}" al catálogo`;
    const formatCreateLabelModelo = (input: string) => `➕ Agregar "${input.trim()}" al catálogo`;

    // === Estilos para react-select ===
    const classNames = {
      control: () =>
        "border-2 border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 transition bg-gray-50",
      menu: () => "rounded-xl shadow-lg border border-gray-100 bg-white mt-1 z-50",
    } as const;

    const styles = {
      control: (base: any, state: any) => ({
        ...base,
        minHeight: 52,
        height: 52,
        borderWidth: 2,
        borderRadius: "0.75rem",
        boxShadow: state.isFocused ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
        borderColor: state.isFocused ? "#22c55e" : "#e5e7eb",
        "&:hover": { borderColor: state.isFocused ? "#22c55e" : "#d1d5db" },
        backgroundColor: "#f9fafb",
      }),
      valueContainer: (b: any) => ({ ...b, padding: "0 16px" }),
      input: (b: any) => ({
        ...b,
        margin: 0,
        padding: 0,
        lineHeight: "1.25rem",
        color: "#111827",
      }),
      singleValue: (b: any) => ({
        ...b,
        color: "#111827",
        fontWeight: 500,
      }),
      placeholder: (b: any) => ({
        ...b,
        color: "#9ca3af",
        fontSize: "1rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }),
      dropdownIndicator: (b: any) => ({
        ...b,
        color: "#6b7280",
        padding: "0 12px",
        "&:hover": { color: "#374151" },
      }),
      indicatorsContainer: (b: any) => ({ ...b, height: 52 }),
      option: (b: any, state: any) => ({
        ...b,
        fontSize: "0.95rem",
        color: state.isSelected ? "#ffffff" : "#111827",
        backgroundColor: state.isSelected
          ? "#22c55e"
          : state.isFocused
            ? "#f3f4f6"
            : "#ffffff",
        cursor: "pointer",
      }),
    } as const;

    const compactStyles = {
      ...styles,
      control: (base: any, state: any) => ({
        ...styles.control(base, state),
        minHeight: 44,
        height: 44,
      }),
      valueContainer: (base: any) => ({
        ...styles.valueContainer(base),
        height: 44,
        padding: "0 16px",
        display: "flex",
        alignItems: "center"
      }),
      indicatorsContainer: (base: any) => ({
        ...base,
        height: 44,
      }),
    };

    const theme = (t: any) => ({
      ...t,
      colors: {
        ...t.colors,
        primary: "#22c55e",
        primary25: "#f3f4f6",
        primary50: "#dcfce7",
        neutral0: "#ffffff",
        neutral20: "#e5e7eb",
        neutral30: "#d1d5db",
        neutral40: "#111827",
        neutral50: "#111827",
        neutral60: "#111827",
        neutral70: "#111827",
        neutral80: "#111827",
      },
    });

    const clearSelection = () => {
      setFormData({ vehiculo_id: null, nuevo_vehiculo: null });
    };

    const handleSelect = (option: any) => {
      if (!option) {
        clearSelection();
        return;
      }
      setFormData({
        vehiculo_id: option.value,
        nuevo_vehiculo: null,
      });

      setLocalErrors((p) => {
        const u = { ...p };
        delete u.general;
        return u;
      });
    };

    const handleSaveNew = async () => {
      const errs: Record<string, string> = {};
      const patenteError = getPatenteError(nuevoVehiculo.patente);
      if (patenteError) errs.patente = patenteError;
      if (!tieneMarca(nuevoVehiculo)) errs.marca_id = "La marca es obligatoria.";
      if (!tieneModelo(nuevoVehiculo)) errs.modelo_id = "El modelo es obligatorio.";
      setLocalErrors(errs);
      if (Object.keys(errs).length) {
        if (patenteError) toast.error(patenteError);
        return;
      }

      let currentMarcaId = nuevoVehiculo.marca_id;
      let currentMarcaNombre = marcas.find(m => m.id === currentMarcaId)?.nombre || nuevoVehiculo.marca_nueva;

      // Si se escribió marca_nueva y aún no se guardó en BD, persistirla
      if (!currentMarcaId && nuevoVehiculo.marca_nueva.trim()) {
        const marcaGuardada = await handleCrearMarcaDirecta(nuevoVehiculo.marca_nueva);
        if (marcaGuardada) {
          currentMarcaId = marcaGuardada.id;
          currentMarcaNombre = marcaGuardada.nombre;
        }
      }

      let currentModeloId = nuevoVehiculo.modelo_id;
      let currentModeloNombre = modelos.find(m => m.id === currentModeloId)?.nombre || nuevoVehiculo.modelo_nuevo;

      // Si se escribió modelo_nuevo y aún no se guardó en BD, persistirlo
      if (!currentModeloId && nuevoVehiculo.modelo_nuevo.trim() && currentMarcaId) {
        const modeloGuardado = await handleCrearModeloDirecto(nuevoVehiculo.modelo_nuevo, currentMarcaId);
        if (modeloGuardado) {
          currentModeloId = modeloGuardado.id;
          currentModeloNombre = modeloGuardado.nombre;
        }
      }

      setFormData({
        vehiculo_id: null,
        nuevo_vehiculo: {
          patente: normalizePatente(nuevoVehiculo.patente),
          marca_id: currentMarcaId,
          marca_nueva: currentMarcaId ? null : nuevoVehiculo.marca_nueva.trim() || null,
          modelo_id: currentModeloId,
          modelo_nuevo: currentModeloId ? null : nuevoVehiculo.modelo_nuevo.trim() || null,
          anio: nuevoVehiculo.anio,
          marca_nombre: currentMarcaNombre,
          modelo_nombre: currentModeloNombre,
        },
      });

      setShowNew(false);
      setLocalErrors({});
      setNuevoVehiculo({ ...VEHICULO_VACIO });
      toast.success("Vehículo asignado a la orden");
    };

    const handleRemove = () => {
      clearSelection();
      setLocalErrors({});
      setShowNew(false);
    };

    const hasSummary = Boolean(formData.vehiculo_id || formData.nuevo_vehiculo);

    // Generar resumen para mostrar
    const resumenLabel = formData.nuevo_vehiculo
      ? (() => {
        const v = formData.nuevo_vehiculo;
        const marcaNombre = v.marca_nombre || v.marca_nueva || marcas.find(m => m.id === v.marca_id)?.nombre || 'Sin marca';
        const modeloNombre = v.modelo_nombre || v.modelo_nuevo || modelos.find(m => m.id === v.modelo_id)?.nombre || 'Sin modelo';
        return `${v.patente} — ${marcaNombre} ${modeloNombre} (${v.anio || 'Sin año'})`;
      })()
      : flatOptions.find((o) => o.value === formData.vehiculo_id)?.label;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-800 mb-1">Vehículo *</label>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Select
              options={options}
              placeholder="Buscar o seleccionar vehículo por patente o modelo…"
              isClearable
              value={flatOptions.find((opt) => opt.value === formData.vehiculo_id) || null}
              onChange={handleSelect}
              classNames={classNames}
              styles={compactStyles}
              theme={theme}
              noOptionsMessage={() => "No se encontró el vehículo. Podés crearlo haciendo clic en '+ Nuevo'"}
              components={{ IndicatorSeparator: null }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowNew((v) => !v);
              if (!showNew) clearSelection();
            }}
            className={`h-11 px-3 inline-flex items-center gap-2 rounded-xl transition shadow font-medium ${
              showNew
                ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
            title="Nuevo vehículo"
          >
            <Plus className="h-5 w-5" />
            <span>{showNew ? 'Ocultar' : 'Nuevo'}</span>
          </button>

          {hasSummary && (
            <DeleteButton
              onClick={handleRemove}
              size='xl'
            />
          )}
        </div>

        {showNew && (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50/20 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-green-100">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-green-600" />
                <h4 className="font-bold text-gray-900 text-sm">Cargar Nuevo Vehículo</h4>
              </div>
              <span className="text-xs text-green-700 bg-green-100 font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                Impacta en catálogo automáticamente
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Patente */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Patente *</label>
                <input
                  placeholder="Ej: ABC123 o AB123CD"
                  className={`w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition font-semibold tracking-wider ${
                    localErrors.patente ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                  value={nuevoVehiculo.patente}
                  onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, patente: normalizePatente(e.target.value) }))}
                />
                {localErrors.patente && <p className="mt-1 text-sm text-red-600">{localErrors.patente}</p>}
              </div>

              {/* Año */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Año</label>
                <input
                  type="number"
                  placeholder="Año de fabricación"
                  className="w-full px-4 py-3 bg-white border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition border-gray-200 hover:border-gray-300"
                  value={nuevoVehiculo.anio}
                  onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, anio: parseInt(e.target.value) || new Date().getFullYear() }))}
                />
              </div>

              {/* Marca */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Marca *</label>
                  <button
                    type="button"
                    onClick={() => setShowModalMarca(true)}
                    className="text-xs font-semibold text-green-600 hover:text-green-800 flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nueva Marca
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CreatableSelect
                      options={marcaOptions}
                      placeholder="Seleccionar o escribir Marca…"
                      isClearable
                      value={marcaValue}
                      onChange={async (option: OpcionCatalogo | null) => {
                        if (option?.__isNew__) {
                          await handleCrearMarcaDirecta(option.label);
                        } else {
                          setNuevoVehiculo(prev => ({
                            ...prev,
                            marca_id: option ? option.value : null,
                            marca_nueva: "",
                            modelo_id: null,
                            modelo_nuevo: "",
                          }));
                        }
                      }}
                      isValidNewOption={esNombreValido}
                      formatCreateLabel={formatCreateLabelMarca}
                      classNames={classNames}
                      styles={styles}
                      theme={theme}
                      components={{ IndicatorSeparator: null }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModalMarca(true)}
                    className="h-[52px] w-[52px] flex items-center justify-center rounded-xl bg-green-600 text-white hover:bg-green-700 transition shadow shrink-0"
                    title="Dar de alta nueva marca en catálogo"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {localErrors.marca_id && <p className="mt-1 text-sm text-red-600">{localErrors.marca_id}</p>}
              </div>

              {/* Modelo */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700">Modelo / Vehículo *</label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!tieneMarca(nuevoVehiculo)) {
                        toast.error("Seleccioná o creá una marca primero.");
                        return;
                      }
                      setShowModalModelo(true);
                    }}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      tieneMarca(nuevoVehiculo)
                        ? 'text-green-600 hover:text-green-800 cursor-pointer'
                        : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Nuevo Modelo
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <CreatableSelect
                      options={modeloOptions}
                      placeholder={tieneMarca(nuevoVehiculo) ? "Seleccionar o escribir Modelo…" : "Primero seleccioná una marca"}
                      isClearable
                      isDisabled={!tieneMarca(nuevoVehiculo)}
                      value={modeloValue}
                      onChange={async (option: OpcionCatalogo | null) => {
                        if (option?.__isNew__) {
                          await handleCrearModeloDirecto(option.label);
                        } else {
                          setNuevoVehiculo(prev => ({
                            ...prev,
                            modelo_id: option ? option.value : null,
                            modelo_nuevo: "",
                          }));
                        }
                      }}
                      isValidNewOption={esNombreValido}
                      formatCreateLabel={formatCreateLabelModelo}
                      noOptionsMessage={() => tieneMarca(nuevoVehiculo) ? "Escribí el modelo para agregarlo al catálogo" : "Seleccioná una marca"}
                      classNames={classNames}
                      styles={styles}
                      theme={theme}
                      components={{ IndicatorSeparator: null }}
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!tieneMarca(nuevoVehiculo)}
                    onClick={() => setShowModalModelo(true)}
                    className="h-[52px] w-[52px] flex items-center justify-center rounded-xl bg-green-600 text-white hover:bg-green-700 transition shadow shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Dar de alta nuevo modelo en catálogo"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
                {localErrors.modelo_id && <p className="mt-1 text-sm text-red-600">{localErrors.modelo_id}</p>}
              </div>

              {/* Botones de acción */}
              <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveNew}
                  className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Usar este vehículo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNew(false);
                    setNuevoVehiculo({ ...VEHICULO_VACIO });
                    setLocalErrors({});
                  }}
                  className="h-12 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {hasSummary && !showNew && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 flex items-center justify-between">
            <p className="text-gray-800 font-medium">🚗 {resumenLabel}</p>
            <span className="text-xs bg-green-100 text-green-800 font-semibold px-2 py-0.5 rounded-full">
              Vehículo asignado
            </span>
          </div>
        )}

        {localErrors.general && <p className="text-sm text-red-600">{localErrors.general}</p>}

        {/* Modal de Alta Rápida de Marca */}
        {showModalMarca && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <FolderPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Nueva Marca de Vehículo</h3>
                    <p className="text-xs text-gray-500">Se agregará al catálogo del sistema automáticamente</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalMarca(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Nombre de la Marca *</label>
                <input
                  type="text"
                  value={nuevaMarcaNombre}
                  onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCrearMarcaDirecta(nuevaMarcaNombre);
                    }
                  }}
                  placeholder="Ej: Toyota, Ford, Chery, BYD..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalMarca(false);
                    setNuevaMarcaNombre("");
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleCrearMarcaDirecta(nuevaMarcaNombre)}
                  disabled={isSavingMarca}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition shadow disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {isSavingMarca ? "Guardando..." : "Guardar en Catálogo"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Alta Rápida de Modelo */}
        {showModalModelo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Nuevo Modelo / Vehículo</h3>
                    <p className="text-xs text-gray-500">
                      Para marca: <strong className="text-gray-800">{marcas.find(m => m.id === nuevoVehiculo.marca_id)?.nombre || 'Seleccionada'}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModalModelo(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="py-4 space-y-3">
                <label className="block text-xs font-semibold text-gray-700">Nombre del Modelo *</label>
                <input
                  type="text"
                  value={nuevoModeloNombre}
                  onChange={(e) => setNuevoModeloNombre(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCrearModeloDirecto(nuevoModeloNombre);
                    }
                  }}
                  placeholder="Ej: Corolla, Ranger, Tiggo 4, Dolphin..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 font-medium"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModalModelo(false);
                    setNuevoModeloNombre("");
                  }}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleCrearModeloDirecto(nuevoModeloNombre)}
                  disabled={isSavingModelo}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition shadow disabled:opacity-50"
                >
                  <Check className="h-4 w-4" />
                  {isSavingModelo ? "Guardando..." : "Guardar en Catálogo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default VehiculoSection;
