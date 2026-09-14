import React, { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, DollarSign, Layers, Tag, Wrench, Store, Bookmark, Check, X } from "lucide-react";
import Select from "react-select";
import { ordenarPorEtiqueta } from "@/lib/utils";
import axios from "axios";
import { toast } from "react-hot-toast";

export interface SubcategoriaDTO {
  id: number;
  nombre: string;
}

export interface CategoriaDTO {
  id: number;
  nombre: string;
  obligatoria: boolean;
  subcategorias: SubcategoriaDTO[];
}

export interface ArticuloDTO {
  id: number;
  nombre: string;
  categorias: CategoriaDTO[];
}

export interface MarcaArticuloDTO {
  id: number;
  nombre: string;
}

export interface Detalle {
  articulo_id: number | null;
  marca_articulo_id?: number | null;
  descripcion: string;
  valor: number | string;
  cantidad: number;
  colocacion_incluida: boolean; // true = Colocación, false = Retiro en local
  atributos: Record<number, number | null>;
}

interface Props {
  detalles: Detalle[];
  setDetalles: (detalles: Detalle[]) => void;
  articulos: ArticuloDTO[];
  marcasArticulos?: MarcaArticuloDTO[];
  errors?: Record<string, string>;
}

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    minHeight: 38,
    height: 38,
    borderRadius: "0.5rem",
    borderWidth: 1,
    borderColor: state.isFocused ? "#22c55e" : "#d1d5db",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(34,197,94,0.25)" : "none",
    "&:hover": { borderColor: state.isFocused ? "#22c55e" : "#9ca3af" },
    backgroundColor: "#ffffff",
    fontSize: "0.875rem",
  }),
  valueContainer: (b: any) => ({ ...b, padding: "0 8px" }),
  input: (b: any) => ({
    ...b,
    margin: 0,
    padding: 0,
    color: "#111827",
  }),
  singleValue: (b: any) => ({
    ...b,
    color: "#111827",
    fontSize: "0.875rem",
  }),
  placeholder: (b: any) => ({
    ...b,
    color: "#9ca3af",
    fontSize: "0.875rem",
  }),
  dropdownIndicator: (b: any) => ({
    ...b,
    padding: "4px 6px",
    color: "#6b7280",
  }),
  clearIndicator: (b: any) => ({
    ...b,
    padding: "4px",
    color: "#9ca3af",
  }),
  indicatorsContainer: (b: any) => ({ ...b, height: 38 }),
  menu: (b: any) => ({
    ...b,
    borderRadius: "0.5rem",
    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
    zIndex: 30,
  }),
  option: (b: any, state: any) => ({
    ...b,
    fontSize: "0.875rem",
    color: state.isSelected ? "#ffffff" : "#111827",
    backgroundColor: state.isSelected
      ? "#22c55e"
      : state.isFocused
        ? "#f3f4f6"
        : "#ffffff",
    cursor: "pointer",
  }),
} as const;

export default function DetallesSection({ detalles, setDetalles, articulos, marcasArticulos = [], errors }: Props) {
  const [listaMarcas, setListaMarcas] = useState<MarcaArticuloDTO[]>(marcasArticulos);
  const [itemIndexForNewMarca, setItemIndexForNewMarca] = useState<number | null>(null);
  const [nuevaMarcaNombre, setNuevaMarcaNombre] = useState<string>("");
  const [isSavingMarca, setIsSavingMarca] = useState<boolean>(false);

  useEffect(() => {
    setListaMarcas(marcasArticulos);
  }, [marcasArticulos]);

  const articulosById = useMemo(() => {
    const map = new Map<number, ArticuloDTO>();
    articulos.forEach((a) => map.set(a.id, a));
    return map;
  }, [articulos]);

  const marcaOptions = useMemo(() => {
    return ordenarPorEtiqueta(
      listaMarcas.map((m) => ({
        value: m.id,
        label: m.nombre,
      })),
      (o) => o.label
    );
  }, [listaMarcas]);

  const handleChange = (index: number, field: keyof Detalle, value: any) => {
    const nuevos = [...detalles];
    (nuevos[index] as any)[field] = value;
    setDetalles(nuevos);
  };

  const handleChangeAtributo = (index: number, categoriaId: number, subcategoriaId: number | null) => {
    const nuevos = [...detalles];
    const actual = nuevos[index];
    nuevos[index] = {
      ...actual,
      atributos: {
        ...(actual.atributos || {}),
        [categoriaId]: subcategoriaId,
      },
    };
    setDetalles(nuevos);
  };

  const handleArticuloChange = (index: number, articuloIdRaw: string) => {
    const articuloId = articuloIdRaw ? Number(articuloIdRaw) : null;
    const articulo = articuloId ? articulosById.get(articuloId) : undefined;

    const nuevos = [...detalles];
    const prev = nuevos[index];

    const atributosReset: Record<number, number | null> = {};
    if (articulo?.categorias?.length) {
      articulo.categorias.forEach((c) => {
        atributosReset[c.id] = null;
      });
    }

    nuevos[index] = {
      ...prev,
      articulo_id: articuloId,
      atributos: atributosReset,
    };

    setDetalles(nuevos);
  };

  const handleAdd = () => {
    setDetalles([
      {
        articulo_id: null,
        marca_articulo_id: null,
        descripcion: "",
        valor: "",
        cantidad: 1,
        colocacion_incluida: true, // Por defecto: Colocación
        atributos: {},
      },
      ...detalles,
    ]);
  };

  const handleToggleColocacion = (index: number, value: boolean) => {
    const nuevos = [...detalles];
    nuevos[index].colocacion_incluida = value;
    setDetalles(nuevos);
  };

  const handleRemove = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const handleCreateMarca = async () => {
    const nombreTrimmed = nuevaMarcaNombre.trim();
    if (!nombreTrimmed) {
      toast.error("Ingresá el nombre de la marca.");
      return;
    }

    setIsSavingMarca(true);
    try {
      const response = await axios.post<MarcaArticuloDTO>("/api/marcas-articulos", {
        nombre: nombreTrimmed,
      });
      const nuevaMarca = response.data;

      // Actualizar lista local de marcas si no existía ya
      setListaMarcas((prev) => {
        if (prev.some((m) => m.id === nuevaMarca.id)) return prev;
        return [...prev, nuevaMarca];
      });

      // Asignar automáticamente la nueva marca al artículo actual
      if (itemIndexForNewMarca !== null) {
        handleChange(itemIndexForNewMarca, "marca_articulo_id", nuevaMarca.id);
      }

      toast.success(`Marca "${nuevaMarca.nombre}" agregada y seleccionada.`);
      setNuevaMarcaNombre("");
      setItemIndexForNewMarca(null);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Error al crear la marca.";
      toast.error(errorMsg);
    } finally {
      setIsSavingMarca(false);
    }
  };

  const total = detalles.reduce((sum, d) => {
    const v = d.valor === "" ? 0 : Number(d.valor);
    return sum + (isNaN(v) ? 0 : v) * (Number(d.cantidad) || 0);
  }, 0);

  const getItemError = (idx: number, field: string) => {
    if (!errors) return "";
    return errors[`detalles.${idx}.${field}`] || "";
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center shadow-md">
            <Layers className="text-white w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Detalles de la Orden</h2>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all shadow-md hover:shadow-lg"
        >
          <Plus className="h-5 w-5" />
          Agregar ítem
        </button>
      </div>

      {/* Modal / Popup Inline para Nueva Marca */}
      {itemIndexForNewMarca !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-green-600" />
                <h3 className="text-lg font-bold text-gray-900">Nueva Marca de Artículo</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemIndexForNewMarca(null);
                  setNuevaMarcaNombre("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                Nombre de la Marca *
              </label>
              <input
                type="text"
                value={nuevaMarcaNombre}
                onChange={(e) => setNuevaMarcaNombre(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateMarca();
                  }
                }}
                placeholder="Ej: Pilkington, Sekurit, Fuyao..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-gray-900 font-medium"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setItemIndexForNewMarca(null);
                  setNuevaMarcaNombre("");
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateMarca}
                disabled={isSavingMarca}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition shadow disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {isSavingMarca ? "Guardando..." : "Guardar Marca"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de ítems */}
      <div className="space-y-6">
        {detalles.map((detalle, index) => {
          const articulo = detalle.articulo_id ? articulosById.get(detalle.articulo_id) : undefined;
          const isItemConfigured = detalle.articulo_id !== null;
          const hasAtributoErrors = articulo?.categorias?.some(
            (cat) => cat.obligatoria && getItemError(index, `atributos.${cat.id}`)
          );

          return (
            <div
              key={index}
              className={`rounded-xl border-2 p-4 transition-all ${hasAtributoErrors
                ? 'border-red-400 bg-red-50/30'
                : isItemConfigured
                  ? 'border-green-300 bg-green-50/30'
                  : 'border-gray-200 bg-white'
                }`}
            >
              {/* Fila principal compacta */}
              <div className="flex flex-wrap items-end gap-3">
                {/* Artículo */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Artículo *
                  </label>
                  <div className="relative">
                    <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <select
                      value={detalle.articulo_id ?? ""}
                      onChange={(e) => handleArticuloChange(index, e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition ${getItemError(index, "articulo_id") ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                        }`}
                    >
                      <option value="">Seleccionar artículo...</option>
                      {ordenarPorEtiqueta(articulos, (a) => a.nombre).map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Marca (Buscable con react-select + botón +) */}
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Marca
                  </label>
                  <div className="flex items-center gap-1">
                    <div className="flex-1 min-w-0">
                      <Select
                        options={marcaOptions}
                        placeholder="Buscar o seleccionar marca..."
                        isClearable
                        isSearchable
                        value={marcaOptions.find((opt) => opt.value === detalle.marca_articulo_id) || null}
                        onChange={(opt: any) =>
                          handleChange(index, "marca_articulo_id", opt ? opt.value : null)
                        }
                        styles={selectStyles}
                        components={{ IndicatorSeparator: null }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setItemIndexForNewMarca(index);
                        setNuevaMarcaNombre("");
                      }}
                      className="h-[38px] w-[38px] flex items-center justify-center rounded-lg bg-green-600 text-white hover:bg-green-700 transition shadow shrink-0"
                      title="Agregar nueva marca de artículo"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Valor */}
                <div className="w-28">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Valor *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={detalle.valor === "" ? "" : detalle.valor}
                      onChange={(e) => handleChange(index, "valor", e.target.value === "" ? "" : e.target.value)}
                      placeholder="0"
                      className={`w-full pl-8 pr-2 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition ${getItemError(index, "valor") ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                        }`}
                    />
                  </div>
                </div>

                {/* Cantidad */}
                <div className="w-20">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Cant. *
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={detalle.cantidad}
                    onChange={(e) => handleChange(index, "cantidad", Math.max(1, Number(e.target.value)))}
                    className={`w-full px-2 py-2 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition text-center ${getItemError(index, "cantidad") ? "border-red-500 bg-red-50" : "border-gray-300 hover:border-gray-400"
                      }`}
                  />
                </div>

                {/* Toggle Buttons: Colocación / Retiro */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => handleToggleColocacion(index, true)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${detalle.colocacion_incluida
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-200'
                      }`}
                    title="Incluye colocación"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    Coloc.
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleColocacion(index, false)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!detalle.colocacion_incluida
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-transparent text-gray-600 hover:bg-gray-200'
                      }`}
                    title="Retiro en local"
                  >
                    <Store className="h-3.5 w-3.5" />
                    Retiro
                  </button>
                </div>

                {/* Eliminar */}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Eliminar ítem"
                  title="Eliminar ítem"
                  disabled={detalles.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Fila de errores */}
              {(getItemError(index, "articulo_id") || getItemError(index, "valor") || getItemError(index, "cantidad")) && (
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-red-600">
                  {getItemError(index, "articulo_id") && <span>{getItemError(index, "articulo_id")}</span>}
                  {getItemError(index, "valor") && <span>{getItemError(index, "valor")}</span>}
                  {getItemError(index, "cantidad") && <span>{getItemError(index, "cantidad")}</span>}
                </div>
              )}

              {/* Atributos del artículo (colapsados visualmente) */}
              {articulo?.categorias?.length ? (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Atributos</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {articulo.categorias.map((cat) => {
                      const selected = detalle.atributos?.[cat.id] ?? null;
                      const hasError = getItemError(index, `atributos.${cat.id}`);
                      return (
                        <div key={cat.id}>
                          <label className="block text-xs text-gray-500 mb-1">
                            {cat.nombre}{cat.obligatoria && <span className="text-red-500 ml-0.5">*</span>}
                          </label>
                          <select
                            value={selected ?? ""}
                            onChange={(e) =>
                              handleChangeAtributo(
                                index,
                                cat.id,
                                e.target.value ? Number(e.target.value) : null
                              )
                            }
                            className={`w-full px-2 py-1.5 text-sm bg-white border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-300'
                              }`}
                          >
                            <option value="">Seleccionar...</option>
                            {ordenarPorEtiqueta(cat.subcategorias, (sc) => sc.nombre).map((sc) => (
                              <option key={sc.id} value={sc.id}>
                                {sc.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !isItemConfigured && (
                  <p className="mt-2 text-xs text-gray-400 italic">
                    Seleccione un artículo para ver atributos.
                  </p>
                )
              )}

              {/* Descripción opcional - más compacta */}
              <div className="mt-3">
                <input
                  type="text"
                  value={detalle.descripcion}
                  onChange={(e) => handleChange(index, "descripcion", e.target.value)}
                  placeholder="Descripción adicional (opcional)..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition placeholder:text-gray-400"
                />
              </div>
            </div>
          );
        })}

        {detalles.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-gray-200 p-6 text-center text-gray-600">
            Aún no agregaste ítems. Usá el botón <strong>“Agregar ítem”</strong>.
          </div>
        )}
      </div>

      {/* Total */}
      <div className="pt-4 border-t border-gray-200 flex items-center justify-end">
        <p className="text-lg font-medium text-gray-800">
          Total estimado:&nbsp;
          <span className="text-2xl font-extrabold text-green-600">
            ${total.toLocaleString("es-AR")}
          </span>
        </p>
      </div>
    </div>
  );
}
