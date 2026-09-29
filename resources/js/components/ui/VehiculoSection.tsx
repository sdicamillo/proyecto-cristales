import { Car, Plus } from "lucide-react";
import { useState, forwardRef, useImperativeHandle, useEffect } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import DeleteButton from "@/components/botones/boton-eliminar";
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

// Marca/modelo pueden venir del catálogo (marca_id / modelo_id) o escribirse a mano
// (marca_nueva / modelo_nuevo); el backend los da de alta al guardar la orden.
const VEHICULO_VACIO = {
  patente: "",
  marca_id: null as number | null,
  marca_nueva: "",
  modelo_id: null as number | null,
  modelo_nuevo: "",
  anio: new Date().getFullYear(),
};

const MAX_NOMBRE = 50;

// Opción de catálogo; react-select marca con __isNew__ las que escribe el usuario
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
    const [nuevoVehiculo, setNuevoVehiculo] = useState({ ...VEHICULO_VACIO });
    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});

    // Cargar marcas al montar el componente
    useEffect(() => {
      axios.get('/api/marcas')
        .then(response => setMarcas(response.data))
        .catch(error => console.error('Error cargando marcas:', error));
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
          if (!v.patente?.trim()) errs["nuevo_vehiculo.patente"] = "La patente es obligatoria.";
          if (!tieneMarca(v)) errs["nuevo_vehiculo.marca_id"] = "La marca es obligatoria.";
          if (!tieneModelo(v)) errs["nuevo_vehiculo.modelo_id"] = "El modelo es obligatorio.";
        }
        setLocalErrors(errs);
        return Object.keys(errs).length === 0;
      },
    }));

    // Opciones para el selector de vehículos existentes
    const options = ordenarPorEtiqueta(
      vehiculos.map((v) => ({
        value: v.id,
        label: `${v.patente} — ${v.marca?.nombre || 'Sin marca'} ${v.modelo?.nombre || 'Sin modelo'} (${v.anio})`,
        patente: v.patente,
        marca: v.marca?.nombre || '',
        modelo: v.modelo?.nombre || '',
        anio: v.anio,
      })),
      (o) => o.label
    );

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

    // Sólo ofrece "Agregar" si el nombre es válido y no existe ya en el catálogo
    const esNombreValido = (input: string, _seleccion: unknown, opciones: readonly unknown[]) => {
      const nombre = input.trim();
      if (!nombre || nombre.length > MAX_NOMBRE) return false;
      return !opciones.some(
        (o) => String((o as OpcionCatalogo).label).toLowerCase() === nombre.toLowerCase()
      );
    };

    const formatCreateLabel = (input: string) => `Agregar "${input.trim()}"`;

    // === Estilos para react-select ===
    const classNames = {
      control: () =>
        "border-2 border-gray-200 rounded-xl shadow-sm hover:border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500 transition bg-gray-50",
      menu: () => "rounded-xl shadow-lg border border-gray-100 bg-white mt-1",
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
        color: "#9ca3af", // color más suave para placeholder
        fontSize: "1rem",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }),
      dropdownIndicator: (b: any, s: any) => ({
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

    const handleSaveNew = () => {
      const errs: Record<string, string> = {};
      if (!nuevoVehiculo.patente.trim()) errs.patente = "La patente es obligatoria.";
      if (!tieneMarca(nuevoVehiculo)) errs.marca_id = "La marca es obligatoria.";
      if (!tieneModelo(nuevoVehiculo)) errs.modelo_id = "El modelo es obligatorio.";
      setLocalErrors(errs);
      if (Object.keys(errs).length) return;

      const marcaNueva = nuevoVehiculo.marca_nueva.trim();
      const modeloNuevo = nuevoVehiculo.modelo_nuevo.trim();

      setFormData({
        vehiculo_id: null,
        nuevo_vehiculo: {
          patente: nuevoVehiculo.patente.trim().toUpperCase(),
          marca_id: nuevoVehiculo.marca_id,
          marca_nueva: marcaNueva || null,
          modelo_id: nuevoVehiculo.modelo_id,
          modelo_nuevo: modeloNuevo || null,
          anio: nuevoVehiculo.anio,
          marca_nombre: marcaNueva || marcas.find(m => m.id === nuevoVehiculo.marca_id)?.nombre,
          modelo_nombre: modeloNuevo || modelos.find(m => m.id === nuevoVehiculo.modelo_id)?.nombre,
        },
      });

      setShowNew(false);
      setLocalErrors({});
      setNuevoVehiculo({ ...VEHICULO_VACIO });
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
        // Usar modelo_nombre guardado o intentar buscarlo (aunque models podría estar vacío si cambió la marca)
        const modeloNombre = v.modelo_nombre || v.modelo_nuevo || modelos.find(m => m.id === v.modelo_id)?.nombre || 'Sin modelo';
        const esNuevoEnCatalogo = Boolean(v.marca_nueva || v.modelo_nuevo);
        return `${v.patente} — ${marcaNombre} ${modeloNombre} (${v.anio})${esNuevoEnCatalogo ? ' · se agregará al catálogo' : ''}`;
      })()
      : options.find((o) => o.value === formData.vehiculo_id)?.label;

    return (
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-800 mb-1">Vehículo *</label>

        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Select
              options={options}
              placeholder="Buscar o seleccionar vehículo…"
              isClearable
              value={options.find((opt) => opt.value === formData.vehiculo_id) || null}
              onChange={handleSelect}
              classNames={classNames}
              styles={compactStyles}
              theme={theme}
              components={{ IndicatorSeparator: null }}
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setShowNew((v) => !v);
              if (!showNew) clearSelection();
            }}
            className="h-11 px-3 inline-flex items-center gap-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition shadow"
            title="Nuevo vehículo"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Nuevo</span>
          </button>

          {hasSummary && (
            <DeleteButton
              onClick={handleRemove}
              size='xl'
            />
          )}
        </div>

        {showNew && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <input
                placeholder="Patente *"
                className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition ${localErrors.patente ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                value={nuevoVehiculo.patente}
                onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, patente: e.target.value }))}
              />
              {localErrors.patente && <p className="mt-1 text-sm text-red-600">{localErrors.patente}</p>}
            </div>

            <div>
              <CreatableSelect
                options={marcaOptions}
                placeholder="Seleccionar o escribir Marca *"
                isClearable
                value={marcaValue}
                onChange={(option: OpcionCatalogo | null) => setNuevoVehiculo(prev => ({
                  ...prev,
                  marca_id: option && !option.__isNew__ ? option.value : null,
                  marca_nueva: option?.__isNew__ ? option.label.trim() : "",
                  // Los modelos dependen de la marca: al cambiarla se limpia la selección
                  modelo_id: null,
                  modelo_nuevo: "",
                }))}
                isValidNewOption={esNombreValido}
                formatCreateLabel={formatCreateLabel}
                classNames={classNames}
                styles={styles}
                theme={theme}
                components={{ IndicatorSeparator: null }}
              />
              {localErrors.marca_id && <p className="mt-1 text-sm text-red-600">{localErrors.marca_id}</p>}
            </div>

            <div>
              <CreatableSelect
                options={modeloOptions}
                placeholder="Seleccionar o escribir Modelo *"
                isClearable
                isDisabled={!tieneMarca(nuevoVehiculo)}
                value={modeloValue}
                onChange={(option: OpcionCatalogo | null) => setNuevoVehiculo(prev => ({
                  ...prev,
                  modelo_id: option && !option.__isNew__ ? option.value : null,
                  modelo_nuevo: option?.__isNew__ ? option.label.trim() : "",
                }))}
                isValidNewOption={esNombreValido}
                formatCreateLabel={formatCreateLabel}
                noOptionsMessage={() => "Escribí el modelo para agregarlo"}
                classNames={classNames}
                styles={styles}
                theme={theme}
                components={{ IndicatorSeparator: null }}
              />
              {localErrors.modelo_id && <p className="mt-1 text-sm text-red-600">{localErrors.modelo_id}</p>}
            </div>

            <div>
              <input
                type="number"
                placeholder="Año"
                className="w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition border-gray-200 hover:border-gray-300"
                value={nuevoVehiculo.anio}
                onChange={(e) => setNuevoVehiculo(prev => ({ ...prev, anio: parseInt(e.target.value) || new Date().getFullYear() }))}
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleSaveNew}
                className="h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow flex items-center justify-center"
              >
                ✔️ Usar este vehículo
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNew(false);
                  setNuevoVehiculo({ ...VEHICULO_VACIO });
                  setLocalErrors({});
                }}
                className="h-12 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {hasSummary && !showNew && (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
            <p className="text-gray-800 font-medium">🚗 {resumenLabel}</p>
          </div>
        )}

        {localErrors.general && <p className="text-sm text-red-600">{localErrors.general}</p>}
      </div>
    );
  }
);

export default VehiculoSection;
