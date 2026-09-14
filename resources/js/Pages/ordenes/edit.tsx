import { Head, Link, useForm } from "@inertiajs/react";
import React, { useEffect, useMemo, useRef } from "react";
import { toast } from "react-hot-toast";

import DashboardLayout from "@/layouts/DashboardLayout";

import ClienteSection, { ClienteSectionRef } from "@/components/ui/ClienteSection";
import VehiculoSection, { VehiculoSectionRef } from "@/components/ui/VehiculoSection";
import DetallesSection, { Detalle as DetalleUI, ArticuloDTO } from "@/components/ui/DetallesSection";
import EstadoSection from "@/components/ui/EstadoSection";
import PagosSection from '@/components/ui/PagosSection';
import { getArgentinaToday, getArgentinaNow } from '@/utils/dateFormat';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { ordenarPorEtiqueta } from '@/lib/utils';

type Estado = { id: number; nombre: string };
type MedioDePago = { id: number; nombre: string };
type CatalogItem = { id: number; nombre: string };

type OrdenDetalleServer = {
  articulo_id: number;
  marca_articulo_id?: number | null;
  descripcion: string | null;
  valor: number | string;
  cantidad: number | string;
  colocacion_incluida: boolean;
  atributos_map?: Record<number, number | null>;
  atributos?: { categoria_id: number; subcategoria_id: number | null }[];
};

type OrdenPagoServer = {
  id: number;
  medio_de_pago_id: number;
  valor: number | string;
  fecha: string;
  pagado: boolean;
  bloqueado: boolean;
  observacion: string | null;
};

type Orden = {
  id: number;
  estado_id: number;
  fecha: string;
  fecha_entrega_estimada?: string | null;
  observacion: string | null;
  con_factura: boolean;
  numero_orden?: string | null;
  es_garantia?: boolean;
  compania_seguro_id?: number | null;
  companiaSeguro?: { id: number; nombre: string } | null;
  detalles: OrdenDetalleServer[];
  pagos: OrdenPagoServer[];
  titular_vehiculo?: any;
};

type FormData = {
  estado_id: number | null;
  fecha: string;
  fecha_entrega_estimada: string;
  observacion: string;
  con_factura: number;
  numero_orden: string;
  es_garantia: boolean;
  compania_seguro_id: number | null;
  titular_id: number | null;
  nuevo_titular: any | null;
  vehiculo_id: number | null;
  nuevo_vehiculo: any | null;
  detalles: DetalleUI[];
  pagos: Array<{
    id?: number;
    medio_de_pago_id: number | string;
    monto: number | string;
    fecha: string;
    pagado: boolean;
    bloqueado?: boolean;
    observacion: string;
  }>;
};

export default function Edit({
  orden,
  estados,
  mediosDePago,
  articulos = [],
  companiasSeguros = [],
  titulares = [],
  marcasArticulos = [],
}: {
  orden: Orden;
  estados: Estado[];
  mediosDePago: MedioDePago[];
  articulos: ArticuloDTO[];
  companiasSeguros: CatalogItem[];
  titulares?: any[];
  marcasArticulos?: any[];
}) {
  const params = new URLSearchParams(window.location.search);
  const returnUrl = params.get("return") || `/ordenes/${orden.id}`;

  const clienteRef = useRef<ClienteSectionRef>(null);
  const vehiculoRef = useRef<VehiculoSectionRef>(null);

  const initial: FormData = {
    estado_id: orden.estado_id ?? null,
    fecha: orden.fecha ? String(orden.fecha).replace('T', ' ').substring(0, 16) : "",
    fecha_entrega_estimada: orden.fecha_entrega_estimada
      ? String(orden.fecha_entrega_estimada).replace('T', ' ').substring(0, 16)
      : "",
    observacion: orden.observacion ?? "",
    con_factura: orden.con_factura ? 1 : 0,

    numero_orden: orden.numero_orden ?? "",
    es_garantia: !!orden.es_garantia,
    compania_seguro_id: orden.compania_seguro_id ?? null,

    titular_id: orden.titular_vehiculo?.titular?.id ?? null,
    nuevo_titular: null,
    vehiculo_id: orden.titular_vehiculo?.vehiculo?.id ?? null,
    nuevo_vehiculo: null,

    detalles: (orden.detalles || []).map((d) => {
      const atributos: Record<number, number | null> = {};

      if ((d as any).atributos && Array.isArray((d as any).atributos)) {
        (d as any).atributos.forEach((a: any) => {
          atributos[a.categoria_id] = a.subcategoria_id;
        });
      } else if (d.atributos_map) {
        Object.entries(d.atributos_map).forEach(([k, v]) => {
          atributos[Number(k)] = v ?? null;
        });
      }

      return {
        articulo_id: d.articulo_id,
        marca_articulo_id: (d as any).marca_articulo_id ?? null,
        descripcion: d.descripcion ?? "",
        valor: d.valor ?? 0,
        cantidad: d.cantidad ?? 1,
        colocacion_incluida: !!d.colocacion_incluida,
        atributos,
      };
    }) as DetalleUI[],

    pagos: (orden.pagos || []).map((p) => ({
      id: p.id,
      medio_de_pago_id: p.medio_de_pago_id,
      monto: p.valor ?? 0,
      fecha: p.fecha ? String(p.fecha).substring(0, 10) : getArgentinaToday(),
      pagado: p.pagado ?? false,
      bloqueado: p.bloqueado ?? false,
      observacion: p.observacion ?? "",
    })),
  };

  const form = useForm(initial as any);
  const data = form.data as FormData;
  const setData = form.setData;
  const put = form.put;
  const processing = form.processing;
  const errors = form.errors as Record<string, string>;

  const uiErrors = errors as Record<string, string>;

  const selectedId = data.compania_seguro_id ?? null;
  const selectedCompania = (orden as any).compania_seguro ?? null;

  const catalogHasSelected =
    selectedId != null && companiasSeguros.some((c) => c.id === selectedId);

  const companiasOptions: CatalogItem[] = ordenarPorEtiqueta(
    [
      ...(!catalogHasSelected && selectedCompania?.id
        ? [{ id: selectedCompania.id, nombre: selectedCompania.nombre }]
        : []),
      ...companiasSeguros,
    ],
    (c) => c.nombre
  );

  const vehiculosDelTitular = (titulares || []).find((t: any) => t.id === data.titular_id)?.vehiculos || [];

  const totalOrden = useMemo(() => {
    return (data.detalles || []).reduce((acc: number, curr: any) => {
      return acc + (Number(curr.valor) || 0) * (Number(curr.cantidad) || 1);
    }, 0);
  }, [data.detalles]);

  const totalPagado = useMemo(() => {
    return (data.pagos || []).reduce((acc: number, p: any) => acc + Number(p.monto || 0), 0);
  }, [data.pagos]);

  const saldo = totalOrden - totalPagado;

  const mergeForm = (patch: Partial<FormData>) => {
    setData((prev: FormData) => ({ ...prev, ...patch }));
  };

  const [localErrors, setLocalErrors] = React.useState<Record<string, string>>({});
  const allErrors = { ...uiErrors, ...localErrors };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const fe = (data as any).fecha_entrega_estimada;

    if (!fe) return toast.error("Completá la fecha de entrega estimada.");
    if (data.fecha && fe < data.fecha) return toast.error("La fecha estimada no puede ser anterior a la fecha.");

    // Validar atributos obligatorios
    const errores: Record<string, string> = {};
    let hayErrores = false;

    data.detalles.forEach((d, idx) => {
      if (d.articulo_id) {
        const art = articulos.find((a: any) => a.id === d.articulo_id);
        if (art?.categorias) {
          art.categorias.forEach((cat: any) => {
            if (cat.obligatoria && !d.atributos?.[cat.id]) {
              errores[`detalles.${idx}.atributos.${cat.id}`] = ' ';
              hayErrores = true;
            }
          });
        }
      }
    });

    setLocalErrors(errores);

    if (hayErrores) {
      if (Object.keys(errores).some(k => k.match(/^detalles\.\d+\.atributos\./))) toast.error('Completá los atributos del artículo que son obligatorios marcados en rojo.');
      return;
    }

    put(`/ordenes/${orden.id}`, {
      onError: (errs) => console.log("Errores:", errs),
    });
  }

  return (
    <DashboardLayout>
      <Head title={`Editar OT #${orden.id}`} />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Editar Orden #{orden.id}</h1>
            <p className="mt-1 text-gray-600">Ajustá cabecera, ítems y pagos. Los pagos bloqueados no pueden modificarse.</p>
          </div>
          <Link href={returnUrl} className="text-sm text-gray-600 hover:text-gray-900">
            Volver
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Cabecera */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Estado *</label>
                <select
                  value={data.estado_id ?? ""}
                  onChange={(e) => mergeForm({ estado_id: e.target.value ? Number(e.target.value) : null })}
                  className="w-full rounded-xl border-2 bg-gray-50 px-4 py-3 font-medium text-gray-900 transition outline-none border-gray-200 hover:border-gray-300"
                >
                  <option value="">Seleccionar...</option>
                  {ordenarPorEtiqueta(estados, (e) => e.nombre).map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
                {errors.estado_id && <p className="mt-2 text-sm text-red-600">{errors.estado_id}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Factura *</label>
                <select
                  value={data.con_factura}
                  onChange={(e) => mergeForm({ con_factura: Number(e.target.value) })}
                  className="w-full rounded-xl border-2 bg-gray-50 px-4 py-3 font-medium text-gray-900 transition outline-none border-gray-200 hover:border-gray-300"
                >
                  <option value={1}>Con turno</option>
                  <option value={0}>Sin turno</option>
                </select>
                {errors.con_factura && <p className="mt-2 text-sm text-red-600">{errors.con_factura}</p>}
              </div>

              <div className="flex items-center gap-3 pt-7">
                <input
                  id="es_garantia"
                  type="checkbox"
                  checked={!!data.es_garantia}
                  onChange={(e) => mergeForm({ es_garantia: e.target.checked })}
                  className="h-5 w-5"
                />
                <label htmlFor="es_garantia" className="text-sm font-semibold text-gray-800">
                  Es garantía
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Fecha *</label>
                <DateTimePicker
                  value={data.fecha}
                  onChange={(val) => setData((prev: FormData) => ({ ...prev, fecha: val }))}
                  error={!!uiErrors.fecha}
                />
                {errors.fecha && <p className="mt-2 text-sm text-red-600">{errors.fecha}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Fecha de entrega estimada *</label>
                <DateTimePicker
                  value={data.fecha_entrega_estimada}
                  onChange={(val) => setData((prev: FormData) => ({ ...prev, fecha_entrega_estimada: val }))}
                  minDate={data.fecha || undefined}
                  error={!!uiErrors.fecha_entrega_estimada}
                />
                {errors.fecha_entrega_estimada && <p className="mt-2 text-sm text-red-600">{errors.fecha_entrega_estimada}</p>}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">Número de orden</label>
                <input
                  type="text"
                  disabled
                  value={data.numero_orden}
                  className="w-full rounded-xl border-2 bg-gray-100 px-4 py-3 font-medium text-gray-500 cursor-not-allowed outline-none border-gray-200"
                />
              </div>
            </div>

            {/* Seguro */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-gray-800">Compañía de seguros</label>
              <select
                value={data.compania_seguro_id ?? ""}
                onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setData((prev: FormData) => ({ ...prev, compania_seguro_id: v }));
                }}
                className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 font-medium text-gray-900 transition outline-none ${uiErrors.compania_seguro_id ? "border-red-500 bg-red-50" : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <option value="">Sin seguro / Particular</option>
                {companiasOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {errors.compania_seguro_id && <p className="mt-2 text-sm text-red-600">{errors.compania_seguro_id}</p>}
            </div>

            {/* Observación */}
            <div className="mt-6">
              <label className="mb-2 block text-sm font-semibold text-gray-800">Observación</label>
              <textarea
                value={data.observacion}
                onChange={(e) => setData((prev: FormData) => ({ ...prev, observacion: e.target.value }))}
                placeholder="Agregar alguna nota o aclaración..."
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-medium text-gray-800 transition outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500"
                rows={3}
              />
              {errors.observacion && <p className="mt-2 text-sm text-red-600">{errors.observacion}</p>}
            </div>
          </div>

          {/* Cliente / Vehículo */}
          <ClienteSection ref={clienteRef} titulares={titulares} formData={data as any} setFormData={(nd: any) => mergeForm(nd)} />
          <VehiculoSection ref={vehiculoRef} vehiculos={vehiculosDelTitular} formData={data as any} setFormData={(nd: any) => mergeForm(nd)} />

          {/* Detalles */}
          <DetallesSection
            detalles={data.detalles}
            articulos={articulos}
            marcasArticulos={marcasArticulos}
            errors={allErrors}
            setDetalles={(nuevos: DetalleUI[]) => {
              setData((prev: FormData) => ({
                ...prev,
                detalles: nuevos,
              }));
            }}
          />

          {/* Pagos */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <PagosSection
                pagos={data.pagos}
                setPagos={(pagos) => setData((prev: FormData) => ({ ...prev, pagos }))}
                mediosDePago={mediosDePago}
                totalOrden={totalOrden}
                errors={errors as Record<string, string>}
                modoEdicion={true}
              />
            </div>

            <div className="mt-4 flex justify-end">
              <div className="text-right space-y-1">
                <div className="text-sm text-gray-600">
                  Total pagado:{" "}
                  <span className="font-semibold text-gray-900">${totalPagado.toLocaleString("es-AR")}</span>
                </div>
                <div className={`text-sm font-medium ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
                  Saldo: ${saldo.toLocaleString("es-AR")}
                </div>
              </div>
            </div>
          </div>

          {/* Estado (hidden) */}
          <div className="hidden">
            <EstadoSection estados={estados} formData={data as any} setFormData={(nd: any) => mergeForm(nd)} errors={errors} />
          </div>

          {/* Acciones */}
          <div className="flex gap-4 border-t border-gray-200 pt-6">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 transform rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:from-green-600 hover:to-green-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processing ? "Guardando..." : "💾 Guardar cambios"}
            </button>

            <Link
              href={returnUrl}
              className="rounded-xl border-2 border-gray-300 px-8 py-3.5 text-center font-bold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}