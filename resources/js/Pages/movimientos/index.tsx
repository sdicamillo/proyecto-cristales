// resources/js/pages/movimientos/index.tsx

import { Head, Link, router } from '@inertiajs/react';
import { Movimiento } from '@/types/movimiento';
import DashboardLayout from '@/layouts/DashboardLayout';
import EditButton from '@/components/botones/boton-editar';
import ViewButton from '@/components/botones/boton-ver';
import MontoConDolares, { TotalDolares } from '@/components/ui/MontoConDolares';
import { formatDateTimeToArgentina } from '@/utils/dateFormat';
import { Lock } from 'lucide-react';

interface Props {
    movimientos: Movimiento[];
    tipo: string;   // 'ingreso' o 'egreso'
    label: string;  // 'Ingreso' o 'Egreso'
}

export default function Index({ movimientos, tipo, label }: Props) {
    const labelPlural = label.endsWith('s') ? label : `${label}s`;
    const tipoPlural = tipo.endsWith('s') ? tipo : `${tipo}s`;

    // Pesos y dólares por separado: los movimientos en USD no suman a los pesos
    const totalPesos = movimientos.reduce((sum, m) => (m.monto_usd == null ? sum + Number(m.monto) : sum), 0);
    const totalUsd = movimientos.reduce((sum, m) => sum + Number(m.monto_usd ?? 0), 0);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    };

    return (
        <DashboardLayout>
            <Head title={label} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{labelPlural}</h1>
                        <p className="text-gray-600 mt-2">Listado de {tipoPlural} registrados</p>
                    </div>
                    <Link
                        href={`/${tipoPlural}/create`}
                        className={`${tipo === 'egreso'
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-green-600 hover:bg-green-700'
                            } text-white font-medium py-2.5 px-6 rounded-lg transition shadow-lg hover:shadow-xl`}
                    >
                        + Nuevo {tipo}
                    </Link>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
                    {movimientos.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                </svg>
                            </div>
                            <p className="text-gray-500 text-lg font-semibold mb-2">No hay {tipoPlural.toLowerCase()} registrados</p>
                            <p className="text-gray-400 text-sm mb-4">Comienza registrando tu primer {tipo.toLowerCase()}</p>
                            <Link
                                href={`/${tipoPlural}/create`}
                                className={`inline-block mt-2 ${tipo === 'egreso'
                                        ? 'bg-red-600 hover:bg-red-700'
                                        : 'bg-green-600 hover:bg-green-700'
                                    } text-white px-6 py-2.5 rounded-lg font-semibold transition`}
                            >
                                Registrar el primero →
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Fecha
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Concepto
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Medio de Pago
                                        </th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Origen
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Monto
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {movimientos.map((movimiento) => {
                                        const tieneOT = movimiento.orden_de_trabajo_id != null;
                                        
                                        return (
                                            <tr key={movimiento.id} className="hover:bg-gray-50 transition">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {formatDateTimeToArgentina(movimiento.fecha)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                    {movimiento.concepto?.nombre || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                    {movimiento.medio_de_pago?.nombre || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {tieneOT ? (
                                                        <button
                                                            onClick={() => router.visit(`/ordenes/${movimiento.orden_de_trabajo_id}`)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200 hover:border-blue-300 transition cursor-pointer"
                                                        >
                                                            <Lock className="w-3 h-3" />
                                                            OT #{movimiento.orden_de_trabajo_id}
                                                        </button>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                                                            Manual
                                                        </span>
                                                    )}
                                                </td>
                                                <td
                                                    className={`px-6 py-4 whitespace-nowrap text-sm font-semibold text-right ${tipo === 'egreso' ? 'text-red-600' : 'text-green-600'
                                                        }`}
                                                >
                                                    <MontoConDolares
                                                        monto={movimiento.monto}
                                                        montoUsd={movimiento.monto_usd}
                                                        tipoCambio={movimiento.tipo_cambio}
                                                        formatMonto={formatMoney}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className="flex justify-end gap-2">
                                                        <ViewButton
                                                            onClick={() => {
                                                                window.location.href = `/${tipoPlural}/${movimiento.id}`;
                                                            }}
                                                        />
                                                        {/* Solo mostrar editar si NO tiene OT */}
                                                        {!tieneOT && (
                                                            <EditButton 
                                                                onClick={() => {
                                                                    window.location.href = `/${tipoPlural}/${movimiento.id}/edit`;
                                                                }}
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Resumen */}
                {movimientos.length > 0 && (
                    <div className="mt-6 bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Total de {tipoPlural.toLowerCase()}:</span>
                                <span className="flex flex-col items-end">
                                    <span
                                        className={`text-2xl font-bold ${tipo === 'egreso' ? 'text-red-600' : 'text-green-600'
                                            }`}
                                    >
                                        {formatMoney(totalPesos)}
                                    </span>
                                    <TotalDolares valor={totalUsd} className="text-2xl text-emerald-700" />
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Desde OTs:</span>
                                <span className="text-lg font-bold text-blue-600">
                                    {movimientos.filter(m => m.orden_de_trabajo_id != null).length}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600 font-medium">Manuales:</span>
                                <span className="text-lg font-bold text-gray-700">
                                    {movimientos.filter(m => m.orden_de_trabajo_id == null).length}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}