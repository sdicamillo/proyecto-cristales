// resources/js/pages/movimientos/create.tsx

import { Head, useForm, Link } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import { Concepto, MedioDePago, MovimientoFormData } from '@/types/movimiento';
import DashboardLayout from '@/layouts/DashboardLayout';
import DeleteButton from '@/components/botones/boton-eliminar';
import DateTimePicker from '@/components/ui/DateTimePicker';
import CamposDolares, { calcularMontoPesos } from '@/components/ui/CamposDolares';
import { ordenarPorEtiqueta } from '@/lib/utils';

interface Props {
    conceptos: Concepto[];
    mediosDePago: MedioDePago[];
    tipo: string;   // 'ingreso' o 'egreso'
    label: string;  // 'Ingreso' o 'Egreso'
}

export default function Create({ conceptos, mediosDePago, tipo, label }: Props) {
    const color = tipo === 'egreso' ? 'red' : 'green';
    const labelPlural = label.endsWith('s') ? label : `${label}s`;
    const tipoPlural = tipo.endsWith('s') ? tipo : `${tipo}s`;

    const colorClasses = {
        red: {
            bg500: 'bg-red-500',
            ring500: 'focus:ring-red-500',
            border500: 'focus:border-red-500',
            base: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
        },
        green: {
            bg500: 'bg-green-500',
            ring500: 'focus:ring-green-500',
            border500: 'focus:border-green-500',
            base: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
        },
    };

    const current = colorClasses[color];

    const getFechaArgentina = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}`;
    };

    const { data, setData, post, processing, errors } = useForm<MovimientoFormData>({
        fecha: getFechaArgentina(),
        monto: '',
        monto_usd: '',
        tipo_cambio: '',
        concepto_id: '',
        medio_de_pago_id: '',
        comprobantes: [] as File[],

    });

    const esEnDolares = (medioId: string | number) =>
        mediosDePago.find((m) => String(m.id) === String(medioId))?.moneda === 'USD';
    const enDolares = esEnDolares(data.medio_de_pago_id);

    const cambiarMedio = (medioId: string) => {
        setData((prev) => ({
            ...prev,
            medio_de_pago_id: medioId,
            monto: esEnDolares(prev.medio_de_pago_id) !== esEnDolares(medioId) ? '' : prev.monto,
            monto_usd: '',
            tipo_cambio: '',
        }));
    };

    const cambiarDolares = (campo: 'monto_usd' | 'tipo_cambio', valor: string) => {
        setData((prev) => {
            const next = { ...prev, [campo]: valor };
            return { ...next, monto: calcularMontoPesos(next.monto_usd, next.tipo_cambio) };
        });
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/${tipoPlural}`);
    };

    return (
        <DashboardLayout>
            <Head title={`Registrar ${label}`} />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-3">
                        <div className={`w-12 h-12 ${current.bg500} rounded-xl flex items-center justify-center shadow-lg`}>
                            {tipo === 'egreso' ? (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                </svg>
                            ) : (
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Registrar {tipo}</h1>
                            <p className="text-gray-600 mt-1">Complete los datos del {tipo}</p>
                        </div>
                    </div>
                </div>

                {/* Card con formulario */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                    <form onSubmit={submit} className="space-y-6">
                        {/* Fecha */}
                        <div>
                            <label htmlFor="fecha" className="block text-sm font-semibold text-gray-800 mb-2">
                                Fecha *
                            </label>
                            <DateTimePicker
                                value={data.fecha}
                                onChange={(val) => setData('fecha', val)}
                                error={!!errors.fecha}
                            />
                            {errors.fecha && (
                                <p className={`mt-2 text-sm text-red-600 flex items-center gap-1`}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.fecha}
                                </p>
                            )}
                        </div>

                        {/* Monto */}
                        <div>
                            <label htmlFor="monto" className="block text-sm font-semibold text-gray-800 mb-2">
                                {enDolares ? 'Monto en pesos (se calcula con el monto en USD)' : 'Monto *'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold text-lg">$</span>
                                <input
                                    id="monto"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={data.monto}
                                    readOnly={enDolares}
                                    onChange={(e) => setData('monto', e.target.value)}
                                    className={`w-full pl-10 pr-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 ${current.ring500} ${current.border500} focus:bg-white outline-none transition text-gray-900 font-semibold text-lg ${errors.monto ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                />
                            </div>
                            {errors.monto && (
                                <p className={`mt-2 text-sm text-red-600 flex items-center gap-1`}>
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.monto}
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Concepto */}
                            <div>
                                <label htmlFor="concepto_id" className="block text-sm font-semibold text-gray-800 mb-2">
                                    Concepto *
                                </label>
                                <select
                                    id="concepto_id"
                                    value={data.concepto_id}
                                    onChange={(e) => setData('concepto_id', e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 ${current.ring500} ${current.border500} focus:bg-white outline-none transition text-gray-900 font-medium ${errors.concepto_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <option value="" className="text-gray-500">Seleccione un concepto</option>
                                    {ordenarPorEtiqueta(conceptos, (concepto) => concepto.nombre).map((concepto) => (
                                        <option key={concepto.id} value={concepto.id} className="text-gray-900">
                                            {concepto.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errors.concepto_id && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {errors.concepto_id}
                                    </p>
                                )}
                            </div>

                            {/* Medio de Pago */}
                            <div>
                                <label htmlFor="medio_de_pago_id" className="block text-sm font-semibold text-gray-800 mb-2">
                                    Medio de Pago
                                </label>
                                <select
                                    id="medio_de_pago_id"
                                    value={data.medio_de_pago_id}
                                    onChange={(e) => cambiarMedio(e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 border-2 rounded-xl focus:ring-2 ${current.ring500} ${current.border500} focus:bg-white outline-none transition text-gray-900 font-medium ${errors.medio_de_pago_id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <option value="" className="text-gray-500">Seleccione un medio</option>
                                    {ordenarPorEtiqueta(mediosDePago, (medio) => medio.nombre).map((medio) => (
                                        <option key={medio.id} value={medio.id} className="text-gray-900">
                                            {medio.nombre}
                                        </option>
                                    ))}
                                </select>
                                {errors.medio_de_pago_id && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {errors.medio_de_pago_id}
                                    </p>
                                )}
                            </div>
                        </div>

                        {enDolares && (
                            <CamposDolares
                                montoUsd={data.monto_usd}
                                tipoCambio={data.tipo_cambio}
                                monto={data.monto}
                                onChange={cambiarDolares}
                                errors={{ monto_usd: errors.monto_usd, tipo_cambio: errors.tipo_cambio }}
                                focusClasses={`${current.ring500} ${current.border500}`}
                            />
                        )}

                        {/* Comprobantes */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-800 mb-2">
                                Comprobantes (PDF o imágenes)
                            </label>

                            {/* Input oculto */}
                            <input
                                id="file-upload"
                                type="file"
                                name="comprobantes"
                                multiple
                                className="hidden"
                                onChange={(e) => {
                                    if (!e.target.files) return;
                                    const nuevos = Array.from(e.target.files);

                                    // CONCATENA en vez de reemplazar
                                    setData("comprobantes", [...data.comprobantes, ...nuevos]);
                                }}
                            />

                            {/* Botón custom */}
                            <button
                                type="button"
                                onClick={() => document.getElementById("file-upload")?.click()}
                                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                            >
                                📎 Agregar comprobantes
                            </button>

                            {/* Lista de archivos cargados */}
                            <div className="mt-4 space-y-2">
                                {data.comprobantes.length === 0 && (
                                    <p className="text-sm text-gray-500">No hay archivos cargados.</p>
                                )}

                                {data.comprobantes.map((file, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2"
                                    >
                                        <div className="flex items-center gap-3">
                                            {/* Icono por tipo */}
                                            {file.type.includes("pdf") ? (
                                                <span className="text-red-600">📄</span>
                                            ) : (
                                                <span className="text-blue-600">🖼️</span>
                                            )}

                                            <span className="text-sm font-medium text-gray-800 truncate max-w-[180px]">
                                                {file.name}
                                            </span>
                                        </div>

                                        {/* Botón eliminar */}
                                        <DeleteButton
                                        onClick={() => {
                                                const copia = [...data.comprobantes];
                                                copia.splice(index, 1); // eliminar
                                                setData("comprobantes", copia);
                                            }}>
                                            
                                        </DeleteButton>
                                    </div>
                                ))}
                            </div>

                            {errors.comprobantes && (
                                <p className="mt-2 text-sm text-red-600">{errors.comprobantes}</p>
                            )}

                            {/* Errores individuales de comprobantes.* */}
                            {Object.keys(errors)
                                .filter((key) => key.startsWith("comprobantes."))
                                .map((key) => (
                                    <p className="mt-2 text-sm text-red-600" key={key}>
                                        {(errors as Record<string, any>)[key]}
                                    </p>
                                ))}

                        </div>



                        {/* Botones  */}
                        <div className="flex gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={processing}
                                className={`flex-1 ${current.base} text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]`}
                            >
                                {processing ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Guardando...
                                    </span>
                                ) : (
                                    `💾 Guardar ${label}`
                                )}
                            </button>
                            <Link
                                href={`/${tipoPlural}`}
                                className="px-8 py-3.5 border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all text-center shadow-sm hover:shadow"
                            >
                                Cancelar
                            </Link>
                        </div>
                    </form>
                </div>

                {/* Info adicional */}
                <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-blue-800">
                            <strong>Tip:</strong> Los campos marcados con * son obligatorios. El medio de pago y comprobante son opcionales.
                        </p>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}