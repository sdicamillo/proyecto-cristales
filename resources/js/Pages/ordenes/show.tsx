import ConfirmAnularModal from '@/components/ConfirmAnularModal';
import PrintableODT from '@/components/print/PrintableODT';
import DashboardLayout from '@/layouts/DashboardLayout';
import { PERMISSIONS, useAuthorization } from '@/lib/permissions';
import { formatDateTimeToArgentina, formatDateToArgentina } from '@/utils/dateFormat';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Ban,
    Calendar,
    Car,
    CreditCard,
    FileText,
    Mail,
    Phone,
    Printer,
    User,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Atributo = {
    id: number;
    categoria: { id: number; nombre: string };
    subcategoria: { id: number; nombre: string };
};

type Detalle = {
    descripcion: string;
    valor: number | null;
    cantidad: number;
    colocacion_incluida: boolean;
    articulo: { id: number; nombre: string } | null;
    marca_articulo?: { id: number; nombre: string } | null;
    atributos: Atributo[];
};

type Pago = {
    id: number;
    valor: number | null;
    observacion: string | null;
    fecha: string;
    pagado: boolean;
    bloqueado: boolean;
    medio_de_pago: { nombre: string };
};

type HistorialEstado = {
    id: number;
    created_at: string;
    estado: { id: number; nombre: string };
    user?: { id: number; name: string } | null;
};

type Orden = {
    id: number;
    fecha: string;
    observacion: string | null;
    estado: { nombre: string };
    compania_seguro?: { nombre: string } | null;
    titular_vehiculo: {
        titular: { nombre: string; apellido: string; telefono: string; email: string | null };
        vehiculo: {
            patente: string;
            marca?: { id: number; nombre: string };
            modelo?: { id: number; nombre: string };
            anio: number | null;
        };
    };
    pagos: Pago[];
    detalles: Detalle[];
    historial_estados?: HistorialEstado[];
};

type Props = {
    orden: Orden;
    totalOrden?: number | null;
    totalPagado?: number | null;
    totalRegistrado?: number | null;
    saldoPendiente?: number | null;
};

export default function Show({
    orden,
    totalOrden = null,
    totalPagado = null,
    totalRegistrado = null,
    saldoPendiente = null,
}: Props) {
    const page = usePage().props as any;
    const roleId = Number(page.auth?.user?.role_id ?? 0);
    const esTaller = roleId === 3;
    const { has } = useAuthorization();
    const canViewFinancialAmounts = has(PERMISSIONS.financeAmountsView);
    const showFinancialSections = canViewFinancialAmounts;
    const canManageOrders = has(PERMISSIONS.ordersManage) && !esTaller;
    const companiaNombre = orden.compania_seguro?.nombre ?? 'Sin seguro / Particular';
    const backUrl = esTaller ? '/taller/ots' : '/ordenes';
    const isAnulada = orden.estado.nombre === 'Anulada';
    const isRetirada = orden.estado.nombre === 'Retirada';
    const canManageOrder = canManageOrders && !isAnulada && !isRetirada;
    const [showAnularModal, setShowAnularModal] = useState(false);

    const formatMoney = (value: number) => `$${value.toLocaleString('es-AR')}`;

    function handleAnular() {
        router.delete(`/ordenes/${orden.id}`);
        setShowAnularModal(false);
    }

    return (
        <DashboardLayout>
            <Head title={`Orden #${orden.id}`} />

            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 print:hidden">
                {isAnulada && !esTaller && (
                    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-4">
                        <Ban className="h-6 w-6 text-red-500" />
                        <div>
                            <p className="font-bold text-red-800">Orden anulada</p>
                            <p className="text-sm text-red-600">Esta orden fue anulada y el sistema generó los movimientos de reversa correspondientes.</p>
                        </div>
                    </div>
                )}

                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
                    <div className="flex items-center gap-3">
                        <Link
                            href={backUrl}
                            className="rounded-xl border border-gray-200 bg-white p-2 text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Orden de Trabajo #{orden.id}</h1>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-gray-600">
                                <Calendar className="h-4 w-4" />
                                <span>{formatDateToArgentina(orden.fecha)}</span>
                                <span
                                    className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                        isAnulada
                                            ? 'border-red-200 bg-red-100 text-red-700'
                                            : isRetirada
                                              ? 'border-green-200 bg-green-100 text-green-700'
                                              : 'border-yellow-200 bg-yellow-100 text-yellow-700'
                                    }`}
                                >
                                    {orden.estado.nombre}
                                </span>
                                {!esTaller && <span className="text-sm text-gray-500">Compañía: {companiaNombre}</span>}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        {showFinancialSections && (
                            <button
                                onClick={() => window.print()}
                                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                            >
                                <Printer className="h-4 w-4" />
                                Imprimir
                            </button>
                        )}
                        {canManageOrder && (
                            <Link
                                href={`/ordenes/${orden.id}/edit`}
                                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700"
                            >
                                Editar Orden
                            </Link>
                        )}
                        {canManageOrder && (
                            <button
                                onClick={() => setShowAnularModal(true)}
                                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
                            >
                                <Ban className="h-4 w-4" />
                                Anular
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                    <div className="space-y-8 lg:col-span-2">
                        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                                <FileText className="h-5 w-5 text-gray-500" />
                                <h2 className="font-bold text-gray-900">Detalles del Trabajo</h2>
                            </div>
                            <div className="p-6">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-xs font-semibold uppercase tracking-wider text-gray-500">
                                                <th className="pb-3 pl-2">Descripción</th>
                                                <th className="pb-3 text-center">Cant.</th>
                                                {canViewFinancialAmounts && <th className="pb-3 text-right">Unitario</th>}
                                                {canViewFinancialAmounts && <th className="pb-3 pr-2 text-right">Subtotal</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {orden.detalles.map((detalle, index) => (
                                                <tr key={index} className="text-sm text-gray-700">
                                                    <td className="py-3 pl-2">
                                                        <div className="flex items-center gap-2 font-medium text-gray-900">
                                                            <span>{detalle.articulo?.nombre || 'Artículo no especificado'}</span>
                                                            {detalle.marca_articulo?.nombre && (
                                                                <span className="rounded-md bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-800">
                                                                    {detalle.marca_articulo.nombre}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {detalle.atributos?.length > 0 && (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {detalle.atributos.map((attr) => (
                                                                    <span
                                                                        key={attr.id}
                                                                        className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700"
                                                                    >
                                                                        {attr.categoria?.nombre}: {attr.subcategoria?.nombre}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {detalle.descripcion && <div className="mt-1 text-sm text-gray-500">{detalle.descripcion}</div>}
                                                    </td>
                                                    <td className="py-3 text-center">{detalle.cantidad}</td>
                                                    {canViewFinancialAmounts && (
                                                        <td className="py-3 text-right">
                                                            {detalle.valor !== null ? formatMoney(Number(detalle.valor)) : 'Oculto'}
                                                        </td>
                                                    )}
                                                    {canViewFinancialAmounts && (
                                                        <td className="py-3 pr-2 text-right font-medium">
                                                            {detalle.valor !== null
                                                                ? formatMoney(Number(detalle.valor) * Number(detalle.cantidad))
                                                                : 'Oculto'}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                        {canViewFinancialAmounts && totalOrden !== null && (
                                            <tfoot>
                                                <tr className="border-t border-gray-100">
                                                    <td colSpan={3} className="pt-4 text-right font-bold text-gray-900">
                                                        Total:
                                                    </td>
                                                    <td className="pt-4 pr-2 text-right text-lg font-bold text-green-600">{formatMoney(totalOrden)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </div>
                        </div>

                        {showFinancialSections ? (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <CreditCard className="h-5 w-5 text-gray-500" />
                                    <h2 className="font-bold text-gray-900">Estado de Pago</h2>
                                </div>
                                <div className="space-y-6 p-6">
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                        <SummaryCard label="Total de la orden" value={totalOrden !== null ? formatMoney(totalOrden) : 'Oculto'} />
                                        <SummaryCard label="Total cobrado" value={totalPagado !== null ? formatMoney(totalPagado) : 'Oculto'} accent="green" />
                                        <SummaryCard
                                            label="Registrado sin cobrar"
                                            value={
                                                totalRegistrado !== null && totalPagado !== null
                                                    ? formatMoney(totalRegistrado - totalPagado)
                                                    : 'Oculto'
                                            }
                                            accent="blue"
                                        />
                                        <SummaryCard
                                            label="Saldo pendiente"
                                            value={saldoPendiente !== null ? formatMoney(Math.abs(saldoPendiente)) : 'Oculto'}
                                            accent={saldoPendiente && saldoPendiente > 0 ? 'red' : 'green'}
                                        />
                                    </div>

                                    <div>
                                        <h3 className="mb-4 text-sm font-semibold text-slate-700">Historial de Pagos</h3>
                                        <div className="space-y-3">
                                            {orden.pagos.map((pago) => (
                                                <div key={pago.id} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{pago.medio_de_pago.nombre}</p>
                                                        <p className="text-sm text-gray-500">{formatDateTimeToArgentina(pago.fecha)}</p>
                                                        {pago.observacion && <p className="text-sm text-gray-500">{pago.observacion}</p>}
                                                    </div>
                                                    <span className="font-bold text-gray-900">
                                                        {pago.valor !== null ? formatMoney(Math.abs(Number(pago.valor))) : 'Oculto'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle className="mt-0.5 h-5 w-5 text-amber-600" />
                                        <div>
                                            <p className="font-medium text-amber-900">Información económica oculta</p>
                                            <p className="mt-1 text-sm text-amber-700">
                                                Este rol puede continuar con la gestión operativa de la orden, pero no visualiza montos, cobros ni totales.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                        )}

                        {orden.historial_estados && orden.historial_estados.length > 0 && (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <Calendar className="h-5 w-5 text-gray-500" />
                                    <h2 className="font-bold text-gray-900">Historial de Estados</h2>
                                </div>
                                <div className="space-y-6 p-6">
                                    {orden.historial_estados.map((h, index) => (
                                        <div key={h.id} className="relative pl-6">
                                            {index !== orden.historial_estados!.length - 1 && (
                                                <div className="absolute bottom-0 left-2 top-4 w-px bg-gray-200"></div>
                                            )}
                                            <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border-4 border-white bg-green-500 shadow"></div>
                                            <div className="ml-4">
                                                <div className="font-semibold text-gray-900">{h.estado?.nombre}</div>
                                                <div className="text-sm text-gray-500">{formatDateTimeToArgentina(h.created_at)}</div>
                                                <div className="mt-1 text-xs text-gray-400">{h.user?.name ?? 'Sistema'}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {orden.observacion && (
                            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                    <h2 className="font-bold text-gray-900">Observaciones Generales</h2>
                                </div>
                                <div className="p-6">
                                    <p className="whitespace-pre-wrap text-gray-700">{orden.observacion}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <SideCard title="Cliente" icon={<User className="h-5 w-5 text-gray-500" />}>
                            <p className="text-lg font-semibold text-gray-900">
                                {orden.titular_vehiculo.titular.nombre} {orden.titular_vehiculo.titular.apellido}
                            </p>
                            <InfoRow
                                icon={<Phone className="h-5 w-5 text-gray-400" />}
                                label="Teléfono"
                                value={orden.titular_vehiculo.titular.telefono || 'No registrado'}
                            />
                            <InfoRow
                                icon={<Mail className="h-5 w-5 text-gray-400" />}
                                label="Email"
                                value={orden.titular_vehiculo.titular.email || 'No registrado'}
                            />
                        </SideCard>

                        <SideCard title="Vehículo" icon={<Car className="h-5 w-5 text-gray-500" />}>
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-center">
                                <p className="text-xs uppercase tracking-wider text-gray-500">Patente</p>
                                <p className="text-2xl font-bold tracking-widest text-gray-900">{orden.titular_vehiculo.vehiculo.patente}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Marca</p>
                                    <p className="font-medium text-gray-900">{orden.titular_vehiculo.vehiculo.marca?.nombre ?? '-'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Modelo</p>
                                    <p className="font-medium text-gray-900">{orden.titular_vehiculo.vehiculo.modelo?.nombre ?? '-'}</p>
                                </div>
                            </div>
                            {orden.titular_vehiculo.vehiculo.anio && (
                                <div>
                                    <p className="text-sm text-gray-500">Año</p>
                                    <p className="font-medium text-gray-900">{orden.titular_vehiculo.vehiculo.anio}</p>
                                </div>
                            )}
                        </SideCard>
                    </div>
                </div>
            </div>

            {showFinancialSections && <PrintableODT orden={orden as any} />}

            {canManageOrders && (
                <ConfirmAnularModal
                    open={showAnularModal}
                    onClose={() => setShowAnularModal(false)}
                    onConfirm={handleAnular}
                    ordenId={orden.id}
                />
            )}
        </DashboardLayout>
    );
}

function SideCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                {icon}
                <h2 className="font-bold text-gray-900">{title}</h2>
            </div>
            <div className="space-y-4 p-6">{children}</div>
        </div>
    );
}

function SummaryCard({ label, value, accent = 'slate' }: { label: string; value: string; accent?: 'slate' | 'green' | 'blue' | 'red' }) {
    const accents = {
        slate: 'border-slate-200 bg-slate-50 text-slate-900',
        green: 'border-green-200 bg-green-50 text-green-600',
        blue: 'border-blue-200 bg-blue-50 text-blue-600',
        red: 'border-red-200 bg-red-50 text-red-600',
    };

    return (
        <div className={`rounded-xl border p-4 ${accents[accent]}`}>
            <p className="text-sm">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-start gap-3">
            {icon}
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="font-medium text-gray-900">{value}</p>
            </div>
        </div>
    );
}
