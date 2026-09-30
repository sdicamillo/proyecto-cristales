import { Head, Link } from '@inertiajs/react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Movimiento } from '@/types/movimiento';
import ViewButton from '@/components/botones/boton-ver';
import MontoConDolares from '@/components/ui/MontoConDolares';
import { FileText } from 'lucide-react';
import { formatDateTimeToArgentina } from '@/utils/dateFormat';

interface Props {
    movimiento: Movimiento;
    label: string;
    tipo: string;
}

export default function Show({ movimiento, label, tipo }: Props) {

    console.log('Props completas:', { movimiento, label, tipo });
console.log('Movimiento completo:', movimiento);
    // FIX: Usar el tipo del movimiento si no viene en las props
    const tipoMovimiento = tipo || movimiento.tipo || 'ingreso';
    const tipoPlural = tipoMovimiento.endsWith('s') ? tipoMovimiento : `${tipoMovimiento}s`;

    // Verificar si tiene OT asociada
    const tieneOT = movimiento.orden_de_trabajo_id != null;

    return (
        <DashboardLayout>
            <Head title={`Detalle del ${label}`} />

            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Detalle del {label}</h1>
                    <p className="text-gray-600 mt-1">Información completa del movimiento</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 space-y-6">

                    <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">Fecha</p>
                        <p className="text-lg font-bold text-gray-900">
                            {formatDateTimeToArgentina(movimiento.fecha)}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">Monto</p>
                        <p className={`text-2xl font-bold ${tipoMovimiento === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                            <MontoConDolares
                                monto={movimiento.monto}
                                montoUsd={movimiento.monto_usd}
                                tipoCambio={movimiento.tipo_cambio}
                                align="left"
                                detalleClassName="text-sm font-medium text-gray-500"
                            />
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">Concepto</p>
                        <p className="text-lg font-bold text-gray-900">
                            {movimiento.concepto?.nombre || '—'}
                        </p>
                    </div>

                    <div>
                        <p className="text-sm text-gray-600 font-semibold mb-2">Medio de Pago</p>
                        <p className="text-lg font-bold text-gray-900">
                            {movimiento.medio_de_pago?.nombre || '—'}
                        </p>
                    </div>

                    {/* Comprobante (campo texto) */}
                    {movimiento.comprobante && (
                        <div>
                            <p className="text-sm text-gray-600 font-semibold mb-2">Comprobante</p>
                            <p className="text-lg font-medium text-gray-900">
                                {movimiento.comprobante}
                            </p>
                        </div>
                    )}

                    {/* SECCIÓN: Orden de Trabajo */}
                    {tieneOT && (
                        <div className="border-t border-gray-200 pt-6">
                            <p className="text-sm text-gray-600 font-semibold mb-3">Orden de Trabajo Asociada</p>
                            <Link
                                href={`/ordenes/${movimiento.orden_de_trabajo_id}`}
                                className="inline-flex items-center gap-3 px-5 py-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:bg-blue-100 hover:border-blue-300 transition group"
                            >
                                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <p className="text-base font-bold text-blue-900 group-hover:text-blue-700">
                                        Orden de Trabajo #{movimiento.orden_de_trabajo_id}
                                    </p>
                                    <p className="text-sm text-blue-600">
                                        Click para ver los detalles de la orden →
                                    </p>
                                </div>
                            </Link>
                        </div>
                    )}

                    {/* Archivos Comprobantes */}
                    <div className="border-t border-gray-200 pt-6">
                        <p className="text-sm font-semibold text-gray-800 mb-3">Archivos Adjuntos</p>

                        {(movimiento.comprobantes?.length ?? 0) === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <svg 
                                    className="w-12 h-12 text-gray-300 mx-auto mb-2" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path 
                                        strokeLinecap="round" 
                                        strokeLinejoin="round" 
                                        strokeWidth={2} 
                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                    />
                                </svg>
                                <p className="text-gray-500 text-sm">No hay archivos adjuntos</p>
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {movimiento.comprobantes!.map((c: any) => (
                                    <li
                                        key={c.id}
                                        className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-100 transition"
                                    >
                                        <div className="flex items-center gap-3">
                                            <svg 
                                                className="w-5 h-5 text-gray-400" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                viewBox="0 0 24 24"
                                            >
                                                <path 
                                                    strokeLinecap="round" 
                                                    strokeLinejoin="round" 
                                                    strokeWidth={2} 
                                                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                                                />
                                            </svg>
                                            <span className="text-sm font-medium text-gray-700 truncate max-w-[300px]">
                                                {c.ruta_archivo.split('/').pop()}
                                            </span>
                                        </div>

                                        <ViewButton
                                            onClick={() => {
                                                window.open(`/storage/${c.ruta_archivo}`, '_blank');
                                            }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Acciones */}
                <div className="flex gap-4 mt-8">
                    {/* Solo mostrar editar si NO tiene OT asociada */}
                    {!tieneOT && (
                        <Link
                            href={`/${tipoPlural}/${movimiento.id}/edit`}
                            className="px-6 py-3 bg-yellow-500 text-white font-bold rounded-xl shadow hover:bg-yellow-600 transition"
                        >
                            ✏️ Editar
                        </Link>
                    )}

                    <Link
                        href={`/${tipoPlural}`}
                        className="px-6 py-3 bg-gray-300 font-bold rounded-xl shadow hover:bg-gray-400 transition"
                    >
                        ← Volver
                    </Link>
                </div>

                {/* Mensaje si tiene OT asociada */}
                {tieneOT && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-700">
                            <strong>ℹ️ Nota:</strong> Este movimiento fue generado automáticamente desde una Orden de Trabajo y no puede ser editado manualmente.
                        </p>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}