import { Head, Link, useForm, router } from '@inertiajs/react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import ClienteSection, { ClienteSectionRef } from '@/components/ui/ClienteSection';
import DetallesSection, { Detalle } from '@/components/ui/DetallesSection';
import EstadoSection from '@/components/ui/EstadoSection';
import VehiculoSection, { VehiculoSectionRef } from '@/components/ui/VehiculoSection';
import DashboardLayout from '@/layouts/DashboardLayout';
import PagosSection from '@/components/ui/PagosSection';
import DatePicker from '@/components/ui/DataPicker';
import DateTimePicker from '@/components/ui/DateTimePicker';
import { getArgentinaNow } from '@/utils/dateFormat';
import { ordenarPorEtiqueta } from '@/lib/utils';

type TipoDocumento = 'OT' | 'FC';

type CatalogItem = { id: number; nombre: string };

type FormData = {
    tipo_documento: TipoDocumento;
    numero_orden: string;
    compania_seguro_id: number | null;
    es_garantia: boolean;
    fecha_entrega_estimada: string;
    titular_id: number | null;
    nuevo_titular: any | null;
    vehiculo_id: number | null;
    nuevo_vehiculo: any | null;
    estado_id: number | null;
    pagos: Array<{
        medio_de_pago_id: number | string;
        monto: number | string;
        fecha: string;
        pagado: boolean;
        observacion: string;
    }>;
    observacion: string;
    fecha: string;
    detalles: Detalle[];
};

type Props = {
    titulares: any[];
    estados: any[];
    mediosDePago: any[];
    articulos?: any[];
    companiasSeguros?: CatalogItem[];
    marcasArticulos?: any[];
};

export default function CreateOrdenes({ titulares, estados, mediosDePago, articulos = [], companiasSeguros = [], marcasArticulos = [] }: Props) {
    const detalleInicial: Detalle = {
        articulo_id: null,
        marca_articulo_id: null,
        descripcion: '',
        valor: '',
        cantidad: 1,
        colocacion_incluida: true,
        atributos: {} as any,
    } as Detalle;

    const initialValues: FormData = {
        tipo_documento: 'OT',
        numero_orden: '',
        compania_seguro_id: null,
        es_garantia: false,
        fecha_entrega_estimada: '',
        titular_id: null,
        nuevo_titular: null,
        vehiculo_id: null,
        nuevo_vehiculo: null,
        estado_id: null,
        pagos: [],
        observacion: '',
        fecha: '',
        detalles: [detalleInicial],
    };

    const form = useForm(initialValues as any);
    const data = form.data as FormData;
    const setData = form.setData;
    const processing = form.processing;
    const errors = form.errors as Record<string, string>;

    const setField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
        setData((prev: any) => ({ ...prev, [key]: value }));
    };

    type UiErrors = Record<string, string>;
    const uiErrors: UiErrors = errors as unknown as UiErrors;

    const clienteRef = useRef<ClienteSectionRef>(null);
    const vehiculoRef = useRef<VehiculoSectionRef>(null);

    const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
    const allErrors = { ...uiErrors, ...localErrors };

    const mergeForm = (patch: Partial<FormData>) => {
        setData((prev: FormData) => ({ ...prev, ...patch }));
    };

    // Defaults iniciales con fecha Argentina
    useEffect(() => {
        const hoy = getArgentinaNow(); // Usa UTC-3

        setData((prev: FormData) => ({
            ...prev,
            fecha: prev.fecha || hoy,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        // El número correlativo se asigna en el backend automáticamente basándose en 'tipo_documento'.
        // Ya no generamos en el frontend para evitar números saltados o sucios.
    }, [data.tipo_documento]);

    const vehiculosDelTitular = titulares.find((t: any) => t.id === data.titular_id)?.vehiculos || [];

    useEffect(() => {
        setData((prev: FormData) => ({
            ...prev,
            vehiculo_id: null,
            nuevo_vehiculo: null,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.titular_id]);

    const totalOrden = useMemo(() => {
        return (data.detalles || []).reduce((acc: number, curr: any) => {
            return acc + (Number(curr.valor) || 0) * (Number(curr.cantidad) || 1);
        }, 0);
    }, [data.detalles]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const clienteOk = clienteRef.current?.validate();
        if (!clienteOk) return toast.error('Por favor completá los datos del cliente.');

        const vehiculoOk = vehiculoRef.current?.validate();
        if (!vehiculoOk) return toast.error('Por favor completá los datos del vehículo.');

        const detallesValidos = data.detalles.filter(d => d.articulo_id);

        if (detallesValidos.length === 0) {
            return toast.error('Agregá al menos un artículo a la orden.');
        }

        const errores: Record<string, string> = {};
        let hayErrores = false;

        if (!data.fecha_entrega_estimada) {
            errores['fecha_entrega_estimada'] = 'Ingresá una fecha de entrega estimada.';
            hayErrores = true;
        } else if (data.fecha && data.fecha_entrega_estimada < data.fecha) {
            errores['fecha_entrega_estimada'] = 'La fecha de entrega no puede ser anterior a la fecha de la orden.';
            hayErrores = true;
        }

        if (!data.estado_id) {
            errores['estado_id'] = 'Seleccioná un estado para la orden.';
            hayErrores = true;
        }

        data.detalles.forEach((d, idx) => {
            if (d.articulo_id && (!d.valor || Number(d.valor) <= 0)) {
                errores[`detalles.${idx}.valor`] = 'Sin precio';
                hayErrores = true;
            }

            // Validar atributos obligatorios
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
            if (errores['fecha_entrega_estimada']) toast.error(errores['fecha_entrega_estimada']);
            if (errores['estado_id']) toast.error(errores['estado_id']);
            if (Object.keys(errores).some(k => k.match(/^detalles\.\d+\.valor$/))) toast.error('Hay artículos sin precio.');
            if (Object.keys(errores).some(k => k.match(/^detalles\.\d+\.atributos\./))) toast.error('Completá los atributos del artículo que son obligatorios marcados en rojo.');
            return;
        }

        const dataToSend = {
            ...data,
            detalles: detallesValidos,
            con_factura: data.tipo_documento === 'FC',
        };

        router.post('/ordenes', dataToSend as any, {
            onError: (errs) => {
                toast.dismiss();

                const mensajes = Object.values(errs as Record<string, string>);
                if (mensajes.length === 1) {
                    toast.error(mensajes[0]);
                } else if (mensajes.length > 1) {
                    toast.error(
                        <div>
                            <strong>Corregí los siguientes errores:</strong>
                            <ul className="mt-2 ml-4 list-disc text-sm">
                                {mensajes.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                        </div>,
                        { duration: 6000 }
                    );
                }
            },
        });
    };

    const tituloPantalla = data.tipo_documento === 'FC' ? 'Nueva Orden con Factura' : 'Nueva Orden de Trabajo';

    return (
        <DashboardLayout>
            <Head title={tituloPantalla} />

            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <div className="mb-3 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500 shadow-lg">
                            <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{tituloPantalla}</h1>
                            <p className="mt-1 text-gray-600">Completá los datos necesarios antes de guardar</p>
                        </div>
                    </div>
                </div>

                <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Tipo documento */}
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-800">Tipo de documento *</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setField("tipo_documento", "OT")}
                                            className={`flex-1 rounded-xl border px-4 py-3 font-bold transition ${data.tipo_documento === 'OT'
                                                ? 'border-green-600 bg-green-600 text-white'
                                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            Sin Turno (OT)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setField('tipo_documento', 'FC')}
                                            className={`flex-1 rounded-xl border px-4 py-3 font-bold transition ${data.tipo_documento === 'FC'
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                                                }`}
                                        >
                                            Con turno (FC)
                                        </button>
                                    </div>
                                    {(errors as any).tipo_documento && <p className="mt-2 text-sm text-red-600">{(errors as any).tipo_documento}</p>}
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-gray-800">Número de orden</label>
                                    <input
                                        type="text"
                                        disabled
                                        value="(Se generará automáticamente)"
                                        className="w-full rounded-xl border-2 bg-gray-100 text-gray-500 px-4 py-3 font-medium cursor-not-allowed outline-none border-gray-200"
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-7">
                                    <input
                                        id="es_garantia"
                                        type="checkbox"
                                        checked={!!data.es_garantia}
                                        onChange={(e) => setField('es_garantia', e.target.checked)}
                                        className="h-5 w-5"
                                    />
                                    <label htmlFor="es_garantia" className="text-sm font-semibold text-gray-800">
                                        Es garantía
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Fechas */}
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800">Fecha *</label>
                                <DateTimePicker
                                    value={data.fecha}
                                    onChange={(date: string) => setField('fecha', date)}
                                    error={!!allErrors.fecha}
                                    placeholder="Seleccionar fecha"
                                />
                                {allErrors.fecha && <p className="mt-2 text-sm text-red-600">{allErrors.fecha}</p>}
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-gray-800">Fecha de entrega estimada *</label>
                                <DateTimePicker
                                    value={data.fecha_entrega_estimada}
                                    onChange={(date: string) => setField('fecha_entrega_estimada', date)}
                                    minDate={data.fecha || undefined}
                                    error={!!allErrors.fecha_entrega_estimada}
                                    placeholder="Seleccionar fecha de entrega"
                                />
                                {allErrors.fecha_entrega_estimada && (
                                    <p className="mt-2 text-sm text-red-600">{allErrors.fecha_entrega_estimada}</p>
                                )}
                            </div>
                        </div>

                        {/* Compañía seguros */}
                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Compañía de seguros</label>
                            <select
                                value={data.compania_seguro_id ?? ''}
                                onChange={(e) => {
                                    const value = e.target.value ? Number(e.target.value) : null;
                                    setData((prev: FormData) => ({
                                        ...prev,
                                        compania_seguro_id: value,
                                    }));
                                }}
                                className={`w-full rounded-xl border-2 bg-gray-50 px-4 py-3 font-medium text-gray-900 transition outline-none ${(errors as any).compania_seguro_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <option value="">Sin seguro / Particular</option>
                                {ordenarPorEtiqueta(companiasSeguros, (c) => c.nombre).map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.nombre}
                                    </option>
                                ))}
                            </select>
                            {(errors as any).compania_seguro_id && <p className="mt-2 text-sm text-red-600">{(errors as any).compania_seguro_id}</p>}
                        </div>

                        <ClienteSection ref={clienteRef} titulares={titulares} formData={data} setFormData={(nd: any) => mergeForm(nd)} />
                        <VehiculoSection ref={vehiculoRef} vehiculos={vehiculosDelTitular} formData={data} setFormData={(nd: any) => mergeForm(nd)} />

                        <DetallesSection
                            detalles={data.detalles}
                            articulos={articulos}
                            marcasArticulos={marcasArticulos}
                            errors={allErrors}
                            setDetalles={(nuevos: Detalle[]) => {
                                setData((prev: FormData) => ({
                                    ...prev,
                                    detalles: nuevos,
                                }));
                            }}
                        />

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <PagosSection
                                pagos={data.pagos}
                                setPagos={(pagos) => setData((prev: FormData) => ({ ...prev, pagos }))}
                                mediosDePago={mediosDePago}
                                totalOrden={totalOrden}
                                errors={errors as Record<string, string>}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <EstadoSection
                                estados={estados}
                                formData={data}
                                setFormData={(nd: any) => mergeForm(nd)}
                                errors={allErrors}
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-800">Observación</label>
                            <textarea
                                value={data.observacion}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setData((prev: FormData) => ({
                                        ...prev,
                                        observacion: value,
                                    }));
                                }}
                                placeholder="Agregar alguna nota o aclaración..."
                                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 p-4 font-medium text-gray-800 transition outline-none focus:border-green-500 focus:bg-white focus:ring-2 focus:ring-green-500"
                            />
                        </div>

                        <div className="flex gap-4 border-t border-gray-200 pt-6">
                            <button
                                type="submit"
                                disabled={processing}
                                className="flex-1 transform rounded-xl bg-gradient-to-r from-green-500 to-green-600 px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:scale-[1.02] hover:from-green-600 hover:to-green-700 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {processing ? 'Guardando...' : '💾 Guardar Orden'}
                            </button>

                            <Link
                                href="/ordenes"
                                className="rounded-xl border-2 border-gray-300 px-8 py-3.5 text-center font-bold text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 hover:shadow"
                            >
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}