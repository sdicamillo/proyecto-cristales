import DashboardLayout from '@/layouts/DashboardLayout';
import { PageProps as InertiaPageProps } from '@inertiajs/core';
import { Head, router, usePage } from '@inertiajs/react';
import { TotalDolares, TotalSeparado } from '@/components/ui/MontoConDolares';
import React from 'react';

interface MedioPagoRow {
    medio_de_pago_id: number;
    medio: string;
    moneda: string;
    total: number;
    total_usd: number | null;
    cantidad: number;
    porcentaje: number | null; // null en filas en dólares (el % es sobre pesos)
}

type Totales = { ingresos: number; egresos: number; neto: number };

interface PageProps extends InertiaPageProps {
    fecha: string;
    kpis: Totales;
    kpisUsd: Totales;
    ingresosPorMedio: MedioPagoRow[];
    egresosPorMedio: MedioPagoRow[];
}

export default function Index() {
    const { fecha, kpis, kpisUsd, ingresosPorMedio, egresosPorMedio } = usePage<PageProps>().props;

    // Los dólares van aparte: los KPIs en pesos no los incluyen
    const detalleUsd = (valor: number) => <TotalDolares valor={valor} className="mt-1 text-2xl text-emerald-700" />;

    /* ======================
     * Helpers
     * ====================== */

    function formatCurrency(value: number | null | undefined) {
        const safe = Number(value ?? 0);
        return safe.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
    }

    /* ======================
     * Handlers
     * ====================== */

    function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
        router.get('/resumen-del-dia', { date: e.target.value });
    }

    /* ======================
     * Render
     * ====================== */

    return (
        <DashboardLayout>
            <Head title="Resumen del día" />
            <div className="space-y-6">
                {/* Header */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Resumen del día</h1>
                            <p className="mt-2 text-gray-600">Cierre operativo y desglose por medio de pago</p>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600">Fecha</label>
                                <input
                                    type="date"
                                    value={fecha}
                                    onChange={handleDateChange}
                                    className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                                />
                            </div>
                            <button
                                onClick={() => window.open(`/resumen-del-dia/imprimir?date=${fecha}`, '_blank')}
                                className="mt-6 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 sm:mt-0"
                            >
                                Imprimir
                            </button>
                        </div>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg ring-1 ring-green-100">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-600">Ingresos</p>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-700">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.ingresos)}</p>
                        {detalleUsd(kpisUsd.ingresos)}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-green-500" />
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg ring-1 ring-red-100">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-600">Egresos</p>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.egresos)}</p>
                        {detalleUsd(kpisUsd.egresos)}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-red-500" />
                    </div>

                    <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg ring-1 ring-blue-100">
                        <div className="mb-4 flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-600">Neto</p>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1d6bff]">
                                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                            </div>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(kpis.neto)}</p>
                        {detalleUsd(kpisUsd.neto)}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-[#1d6bff]" />
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* Ingresos por medio de pago */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Ingresos por medio de pago</h2>
                        </div>

                        {ingresosPorMedio.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">No hay ingresos para la fecha seleccionada.</div>
                        ) : (
                            <div className="space-y-3">
                                {ingresosPorMedio.map((row) => (
                                    <div key={row.medio_de_pago_id} className="rounded-xl border border-gray-200 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-gray-900">{row.medio}</p>
                                                <p className="mt-1 text-sm text-gray-500">{row.cantidad} mov.</p>
                                            </div>
                                            <div className="text-right">
                                                <TotalSeparado
                                                    pesos={row.total}
                                                    usd={row.total_usd}
                                                    formatMonto={formatCurrency}
                                                    className="font-semibold text-gray-900"
                                                />
                                                {row.porcentaje !== null && (
                                                    <p className="mt-1 text-sm font-semibold text-gray-500">{row.porcentaje.toFixed(0)}%</p>
                                                )}
                                            </div>
                                        </div>
                                        {row.porcentaje !== null && (
                                            <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                                                <div
                                                    className="h-2 rounded-full bg-green-500"
                                                    style={{ width: `${Math.max(0, Math.min(100, row.porcentaje))}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Egresos por medio de pago */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Egresos por medio de pago</h2>
                        </div>

                        {egresosPorMedio.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">No hay egresos para la fecha seleccionada.</div>
                        ) : (
                            <div className="space-y-3">
                                {egresosPorMedio.map((row) => (
                                    <div key={row.medio_de_pago_id} className="rounded-xl border border-gray-200 p-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-gray-900">{row.medio}</p>
                                                <p className="mt-1 text-sm text-gray-500">{row.cantidad} mov.</p>
                                            </div>
                                            <div className="text-right">
                                                <TotalSeparado
                                                    pesos={row.total}
                                                    usd={row.total_usd}
                                                    formatMonto={formatCurrency}
                                                    className="font-semibold text-gray-900"
                                                />
                                                {row.porcentaje !== null && (
                                                    <p className="mt-1 text-sm font-semibold text-gray-500">{row.porcentaje.toFixed(0)}%</p>
                                                )}
                                            </div>
                                        </div>
                                        {row.porcentaje !== null && (
                                            <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                                                <div
                                                    className="h-2 rounded-full bg-red-500"
                                                    style={{ width: `${Math.max(0, Math.min(100, row.porcentaje))}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
