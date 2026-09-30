import DashboardLayout from '@/layouts/DashboardLayout';
import { PERMISSIONS, useAuthorization } from '@/lib/permissions';
import { Head, Link, usePage } from '@inertiajs/react';
import MontoConDolares, { TotalDolares } from '@/components/ui/MontoConDolares';

interface Movimiento {
    id: number;
    monto: number;
    monto_usd?: number | null;
    tipo_cambio?: number | null;
    created_at: string;
    concepto?: { nombre: string };
    medioDePago?: { nombre: string };
}

interface OrdenDeTrabajo {
    id: number;
    numero_orden: string;
    created_at: string;
    detalles_sum_valor?: number | null;
    titular_vehiculo?: {
        vehiculo?: {
            patente: string;
            marca?: { nombre: string };
            modelo?: { nombre: string };
        };
    };
}

interface DashboardStats {
    totalEgresos: number | null;
    totalIngresos: number | null;
    totalOrdenes: number;
    balanceDelDia: number | null;
    ingresosUsd?: number;
    egresosUsd?: number;
    balanceUsd?: number;
}

interface Props {
    stats: DashboardStats;
    ultimosEgresos: Movimiento[];
    ultimosIngresos: Movimiento[];
    ultimasOrdenes: OrdenDeTrabajo[];
}

export default function AdminDashboard({ stats, ultimosEgresos, ultimosIngresos, ultimasOrdenes }: Props) {
    const { has } = useAuthorization();
    const page = usePage().props as any;
    const canViewFinancialDashboard = has(PERMISSIONS.financeDashboardView);
    const canViewFinancialAmounts = has(PERMISSIONS.financeAmountsView);
    const roleName = page.auth?.user?.role ?? 'Usuario';

    const formatMoney = (amount: number) =>
        new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
        }).format(amount);

    // Los dólares van aparte: los totales en pesos no los incluyen
    const detalleUsd = (valor: number | undefined, className: string) => (
        <TotalDolares valor={valor} className={`text-2xl ${className}`} />
    );

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 60) return `Hace ${diffInMinutes} min${diffInMinutes !== 1 ? 's' : ''}`;
        if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
        }

        const days = Math.floor(diffInMinutes / 1440);
        return `Hace ${days} día${days !== 1 ? 's' : ''}`;
    };

    return (
        <DashboardLayout>
            <Head title="Panel de Control" />

            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
                    <p className="mt-2 text-gray-600">
                        Vista operativa para {roleName}.{!canViewFinancialDashboard && ' Los indicadores económicos están ocultos para este rol.'}
                    </p>
                </div>

                <div
                    className={`grid grid-cols-1 gap-6 ${canViewFinancialDashboard ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-1 lg:grid-cols-1'}`}
                >
                    {canViewFinancialDashboard && stats.balanceDelDia !== null && (
                        <div
                            className={`rounded-2xl p-6 text-white shadow-lg ${stats.balanceDelDia >= 0 ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-orange-500 to-orange-600'}`}
                        >
                            <h3 className="text-sm font-semibold opacity-90">Balance del Día</h3>
                            <p className="mt-4 text-3xl font-bold">{formatMoney(stats.balanceDelDia)}</p>
                            {detalleUsd(stats.balanceUsd, 'opacity-90')}
                            <p className="text-sm opacity-80">Ingresos - Egresos</p>
                        </div>
                    )}

                    {canViewFinancialDashboard && stats.totalIngresos !== null && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                            <h3 className="text-sm font-semibold text-gray-600">Ingresos del Día</h3>
                            <p className="mt-4 text-3xl font-bold text-green-600">{formatMoney(stats.totalIngresos)}</p>
                            {detalleUsd(stats.ingresosUsd, 'text-emerald-700')}
                            <Link href="/ingresos" className="text-sm font-medium text-green-600 hover:text-green-700">
                                Ver detalles
                            </Link>
                        </div>
                    )}

                    {canViewFinancialDashboard && stats.totalEgresos !== null && (
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                            <h3 className="text-sm font-semibold text-gray-600">Egresos del Día</h3>
                            <p className="mt-4 text-3xl font-bold text-red-600">{formatMoney(stats.totalEgresos)}</p>
                            {detalleUsd(stats.egresosUsd, 'text-emerald-700')}
                            <Link href="/egresos" className="text-sm font-medium text-red-600 hover:text-red-700">
                                Ver detalles
                            </Link>
                        </div>
                    )}

                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                        <h3 className="text-sm font-semibold text-gray-600">Órdenes de Trabajo</h3>
                        <p className="mt-4 text-3xl font-bold text-purple-600">{stats.totalOrdenes}</p>
                        <Link href="/ordenes" className="text-sm font-medium text-purple-600 hover:text-purple-700">
                            Ver detalles
                        </Link>
                    </div>
                </div>

                {canViewFinancialDashboard ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Últimos Ingresos</h2>
                                <Link href="/ingresos" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                                    Ver todos
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {ultimosIngresos.map((ingreso) => (
                                    <div key={ingreso.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{ingreso.concepto?.nombre || 'Sin concepto'}</p>
                                            <p className="text-sm text-gray-500">{formatTimeAgo(ingreso.created_at)}</p>
                                        </div>
                                        <span className="ml-4 font-bold text-green-600">
                                            <MontoConDolares
                                                monto={ingreso.monto}
                                                montoUsd={ingreso.monto_usd}
                                                tipoCambio={ingreso.tipo_cambio}
                                                formatMonto={formatMoney}
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-gray-900">Últimos Egresos</h2>
                                <Link href="/egresos" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                                    Ver todos
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {ultimosEgresos.map((egreso) => (
                                    <div key={egreso.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{egreso.concepto?.nombre || 'Sin concepto'}</p>
                                            <p className="text-sm text-gray-500">{formatTimeAgo(egreso.created_at)}</p>
                                        </div>
                                        <span className="ml-4 font-bold text-red-600">
                                            <MontoConDolares
                                                monto={egreso.monto}
                                                montoUsd={egreso.monto_usd}
                                                tipoCambio={egreso.tipo_cambio}
                                                formatMonto={formatMoney}
                                            />
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <RecentOrdersCard
                            orders={ultimasOrdenes}
                            showAmounts={canViewFinancialAmounts}
                            formatMoney={formatMoney}
                            formatTimeAgo={formatTimeAgo}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                            <h2 className="text-xl font-bold text-amber-900">Vista restringida</h2>
                            <p className="mt-2 text-sm text-amber-800">
                                Este usuario puede operar el panel administrativo necesario, pero no accede a ingresos, egresos, montos totales,
                                métricas ni reportes económicos.
                            </p>
                        </div>

                        <RecentOrdersCard orders={ultimasOrdenes} showAmounts={false} formatMoney={formatMoney} formatTimeAgo={formatTimeAgo} />
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

function RecentOrdersCard({
    orders,
    showAmounts,
    formatMoney,
    formatTimeAgo,
}: {
    orders: OrdenDeTrabajo[];
    showAmounts: boolean;
    formatMoney: (amount: number) => string;
    formatTimeAgo: (dateString: string) => string;
}) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Últimas OT</h2>
                <Link href="/ordenes" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Ver todas
                </Link>
            </div>
            <div className="space-y-3">
                {orders.map((orden) => (
                    <div key={orden.id} className="flex items-center justify-between border-b border-gray-100 py-3 last:border-0">
                        <div className="flex-1">
                            <a href={`/ordenes/${orden.id}`}>
                                <p className="font-semibold text-gray-900">
                                    {orden.titular_vehiculo?.vehiculo?.marca?.nombre} {orden.titular_vehiculo?.vehiculo?.modelo?.nombre} -{' '}
                                    {orden.titular_vehiculo?.vehiculo?.patente}
                                </p>
                                <p className="text-sm text-gray-500">{formatTimeAgo(orden.created_at)}</p>
                            </a>
                        </div>
                        {showAmounts && typeof orden.detalles_sum_valor === 'number' && (
                            <span className="ml-4 font-bold text-purple-600">{formatMoney(orden.detalles_sum_valor)}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
