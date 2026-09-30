import DashboardLayout from '@/layouts/DashboardLayout';
import { Head, router } from '@inertiajs/react';
import { TotalDolares, TotalSeparado } from '@/components/ui/MontoConDolares';
import React from 'react';

type Money = number;

interface Range {
    from: string;
    to: string;
}

interface Kpis {
    ingresos: Money;
    egresos: Money;
    neto: Money;
    promedioEgreso: Money;
    ingresosUsd: Money;
    egresosUsd: Money;
    netoUsd: Money;
}

interface ComposicionRow {
    concepto: string;
    total: Money;
    total_usd: Money | null;
    porcentaje: number | null; // % sobre pesos; null si el concepto es solo en dólares
}

interface MedioPagoRow {
    medio: string;
    moneda: string;
    total: Money;
    total_usd: Money | null;
    cantidad: number;
    porcentaje: number | null; // % sobre pesos; null en filas en dólares
}

interface Actividad {
    otCreadas: number;
    otCerradas: number;
    otPendientes: number;
    movimientosCaja: number;
}

interface Props {
    range: Range;
    kpis: Kpis;
    composicionEgresos: ComposicionRow[];
    mediosDePago: MedioPagoRow[];
    actividad: Actividad;
}

function formatCurrency(amount: number) {
    const safe = Number(amount ?? 0);
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 0,
    }).format(safe);
}

function formatPercent(p: number) {
    const safe = Number(p ?? 0);
    return `${safe.toFixed(0)}%`;
}

function isValidISODate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function ProgressBar({ value, colorClass }: { value: number; colorClass: string }) {
    const clamped = Math.max(0, Math.min(100, Number(value ?? 0)));

    return (
        <div className="h-2 w-full rounded-full bg-gray-100">
            <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${clamped}%` }} />
        </div>
    );
}

function MetricCard({
    title,
    value,
    valueUsd,
    subtitle,
    accent,
    icon,
}: {
    title: string;
    value: string;
    valueUsd?: Money;
    subtitle: string;
    accent: 'green' | 'red' | 'blue';
    icon: React.ReactNode;
}) {
    const accentStyles = {
        green: {
            ring: 'ring-green-100',
            iconBg: 'bg-green-50',
            iconText: 'text-green-700',
            bar: 'bg-green-500',
        },
        red: {
            ring: 'ring-red-100',
            iconBg: 'bg-red-50',
            iconText: 'text-red-700',
            bar: 'bg-red-500',
        },
        blue: {
            ring: 'ring-blue-100',
            iconBg: 'bg-blue-50',
            iconText: 'text-[#1d6bff]',
            bar: 'bg-[#1d6bff]',
        },
    } as const;

    const a = accentStyles[accent];

    return (
        <div className={`relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-lg ring-1 ${a.ring}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-gray-600">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
                    <TotalDolares valor={valueUsd} className="mt-1 text-2xl text-emerald-700" />
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${a.iconBg} ${a.iconText}`}>{icon}</div>
            </div>
            <p className="text-sm text-gray-500">{subtitle}</p>
            <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-1 ${a.bar}`} />
        </div>
    );
}

export default function Metrics({ range, kpis, composicionEgresos, mediosDePago, actividad }: Props) {
    const [from, setFrom] = React.useState(range.from);
    const [to, setTo] = React.useState(range.to);

    React.useEffect(() => {
        setFrom(range.from);
        setTo(range.to);
    }, [range.from, range.to]);

    function applyRange() {
        if (!isValidISODate(from) || !isValidISODate(to)) return;
        router.get('/admin/metrics', { from, to }, { preserveScroll: true, preserveState: true });
    }

    function quickRange(days: number) {
        const now = new Date();
        const toISO = now.toISOString().slice(0, 10);
        const fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - (days - 1));
        const fromISO = fromDate.toISOString().slice(0, 10);

        setFrom(fromISO);
        setTo(toISO);
        router.get('/admin/metrics', { from: fromISO, to: toISO }, { preserveScroll: true, preserveState: true });
    }

    return (
        <DashboardLayout>
            <Head title="Métricas" />

            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Métricas</h1>
                        <p className="mt-2 text-gray-600">
                            Rango: {range.from} a {range.to}
                        </p>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg sm:flex-row sm:items-end">
                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Desde</label>
                            <input
                                type="date"
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-600">Hasta</label>
                            <input
                                type="date"
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={applyRange}
                                className="rounded-lg bg-[#1d6bff] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-95"
                            >
                                Aplicar
                            </button>
                            <button
                                type="button"
                                onClick={() => quickRange(30)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                30d
                            </button>
                            <button
                                type="button"
                                onClick={() => quickRange(7)}
                                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                            >
                                7d
                            </button>
                        </div>
                    </div>
                </div>

                {/* A) KPIs del último mes */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <MetricCard
                        title="Ingresos"
                        value={formatCurrency(kpis.ingresos)}
                        valueUsd={kpis.ingresosUsd}
                        subtitle="Suma de ingresos"
                        accent="green"
                        icon={
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                        }
                    />

                    <MetricCard
                        title="Egresos"
                        value={formatCurrency(kpis.egresos)}
                        valueUsd={kpis.egresosUsd}
                        subtitle="Suma de egresos"
                        accent="red"
                        icon={
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                        }
                    />

                    <MetricCard
                        title="Resultado neto"
                        value={formatCurrency(kpis.neto)}
                        valueUsd={kpis.netoUsd}
                        subtitle="Ingresos - Egresos"
                        accent="blue"
                        icon={
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        }
                    />

                    <MetricCard
                        title="Promedio de egreso"
                        value={formatCurrency(kpis.promedioEgreso)}
                        subtitle="Egresos / cantidad de egresos"
                        accent="blue"
                        icon={
                            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-3m3 3V7m3 10v-6m3 6V4M4 20h16" />
                            </svg>
                        }
                    />
                </div>

                {/* B + C */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Composición de Egresos</h2>
                        </div>

                        {composicionEgresos.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">No hay egresos en el período.</div>
                        ) : (
                            <div className="space-y-4">
                                {composicionEgresos.map((row, idx) => (
                                    <div key={`${row.concepto}-${idx}`} className="space-y-2">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-gray-900">{row.concepto}</p>
                                            </div>
                                            <div className="flex items-baseline gap-3 whitespace-nowrap">
                                                <TotalSeparado
                                                    pesos={row.total}
                                                    usd={row.total_usd}
                                                    formatMonto={formatCurrency}
                                                    className="font-semibold text-gray-900"
                                                />
                                                {row.porcentaje !== null && (
                                                    <span className="text-sm font-semibold text-gray-500">{formatPercent(row.porcentaje)}</span>
                                                )}
                                            </div>
                                        </div>
                                        {row.porcentaje !== null && <ProgressBar value={row.porcentaje} colorClass="bg-red-500" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Medios de pago</h2>
                        </div>

                        {mediosDePago.length === 0 ? (
                            <div className="py-10 text-center text-gray-500">No hay movimientos en el período.</div>
                        ) : (
                            <div className="space-y-4">
                                {mediosDePago.map((row, idx) => (
                                    <div key={`${row.medio}-${idx}`} className="space-y-2">
                                        <div className="flex items-baseline justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate font-semibold text-gray-900">{row.medio}</p>
                                                <p className="text-sm text-gray-500">{row.cantidad} mov.</p>
                                            </div>
                                            <div className="flex items-baseline gap-3 whitespace-nowrap">
                                                <TotalSeparado
                                                    pesos={row.total}
                                                    usd={row.total_usd}
                                                    formatMonto={formatCurrency}
                                                    className="font-semibold text-gray-900"
                                                />
                                                {row.porcentaje !== null && (
                                                    <span className="text-sm font-semibold text-gray-500">{formatPercent(row.porcentaje)}</span>
                                                )}
                                            </div>
                                        </div>
                                        {row.porcentaje !== null && <ProgressBar value={row.porcentaje} colorClass="bg-[#1d6bff]" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* D) Actividad operativa */}
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-gray-900">Actividad operativa</h2>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-600">OT creadas</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{actividad.otCreadas}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-600">OT cerradas</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{actividad.otCerradas}</p>
                            <p className="mt-1 text-xs text-gray-500">Completadas</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-600">OT pendientes</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{actividad.otPendientes}</p>
                            <p className="mt-1 text-xs text-gray-500">Iniciado o Pendiente</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <p className="text-sm font-semibold text-gray-600">Mov. de caja</p>
                            <p className="mt-2 text-2xl font-bold text-gray-900">{actividad.movimientosCaja}</p>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
