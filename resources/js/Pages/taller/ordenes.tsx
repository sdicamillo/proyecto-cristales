import DashboardLayout from '@/layouts/DashboardLayout';
import ConfirmPausaModal from '@/components/ConfirmPausaModal';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowRight, Car, PauseCircle, PlayCircle, RotateCcw, User, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

interface OT {
    id: number;
    fecha: string;
    estado: {
        id: number;
        nombre: string;
    };
    titular_vehiculo: {
        titular: {
            nombre: string;
            apellido: string;
        } | null;
        vehiculo: {
            patente: string;
            marca?: { nombre: string } | string;
            modelo?: { nombre: string } | string;
        } | null;
    } | null;
}

interface Estado {
    id: number;
    nombre: string;
}

interface Filters {
    q?: string;
    estado_id?: string | number;
    date_from?: string;
    date_to?: string;
}

interface Props {
    ots: OT[];
    estados: Estado[];
    estadosCambio: Estado[];
    filters?: Filters;
}

// Colores semánticos del flujo de taller
const estadoBadge: Record<string, { pill: string }> = {
    Iniciado:                { pill: 'bg-amber-500 text-white' },
    'En taller':             { pill: 'bg-blue-500 text-white' },
    'Finalizada - Para Retirar': { pill: 'bg-green-500 text-white' },
    Retirada:              { pill: 'bg-green-500 text-white' },
    Anulada:                 { pill: 'bg-red-500 text-white' },
    Pausada:                 { pill: 'bg-violet-700 text-white' },
};

const estadoFilterColors: Record<string, { active: string; inactive: string }> = {
    Iniciado:                { active: 'bg-amber-500 text-white',  inactive: 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' },
    'En taller':             { active: 'bg-blue-600 text-white',   inactive: 'border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100' },
    'Finalizada - Para Retirar': { active: 'bg-green-600 text-white',  inactive: 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100' },
    Retirada:              { active: 'bg-green-600 text-white',  inactive: 'border border-green-300 bg-green-50 text-green-700 hover:bg-green-100' },
    Anulada:                 { active: 'bg-red-600 text-white',    inactive: 'border border-red-300 bg-red-50 text-red-700 hover:bg-red-100' },
    Pausada:                 { active: 'bg-violet-700 text-white', inactive: 'border border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100' },
};

function getBadgePill(nombre: string) {
    return (estadoBadge[nombre] ?? { pill: 'bg-gray-500 text-white' }).pill;
}

function getFilterStyle(nombre: string) {
    return estadoFilterColors[nombre] ?? { active: 'bg-gray-700 text-white', inactive: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100' };
}

export default function OrdenesTaller({ ots, estados, estadosCambio, filters: backendFilters }: Props) {
    const [open, setOpen] = useState(false);
    const [ordenSeleccionada, setOrdenSeleccionada] = useState<OT | null>(null);
    const [estadoId, setEstadoId] = useState<number | null>(null);
    const [pausarOrden, setPausarOrden] = useState<OT | null>(null);
    const [reanudarOrdenId, setReanudarOrdenId] = useState<number | null>(null);
    const pausaForm = useForm({ motivo: '' });

    const [searchQ, setSearchQ] = useState(backendFilters?.q ?? '');
    const [dateFrom, setDateFrom] = useState(backendFilters?.date_from ?? '');
    const [dateTo, setDateTo] = useState(backendFilters?.date_to ?? '');
    const activeEstadoId = backendFilters?.estado_id ? Number(backendFilters.estado_id) : null;

    const getNombre = (value?: { nombre: string } | string) => {
        if (!value) return '';
        return typeof value === 'string' ? value : value.nombre;
    };

    const todayISO = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const yesterdayISO = useMemo(() => {
        const d = new Date(); d.setDate(d.getDate() - 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const last7ISO = useMemo(() => {
        const d = new Date(); d.setDate(d.getDate() - 6);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    function applyFilters(overrides?: Partial<Filters>) {
        const payload: Record<string, any> = {
            q: searchQ,
            estado_id: activeEstadoId ?? '',
            date_from: dateFrom,
            date_to: dateTo,
            ...overrides,
        };

        const cleaned: Record<string, any> = {};
        Object.entries(payload).forEach(([k, v]) => {
            if (v === null || v === undefined) return;
            if (typeof v === 'string' && v.trim() === '') return;
            cleaned[k] = v;
        });

        router.get('/taller/ots', cleaned, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    function toggleEstadoFilter(id: number) {
        applyFilters({ estado_id: activeEstadoId === id ? '' : id });
    }

    function resetFilters() {
        setSearchQ('');
        setDateFrom('');
        setDateTo('');
        router.get('/taller/ots', {}, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    }

    const hasActiveFilters = (backendFilters?.q ?? '') !== '' || activeEstadoId !== null || (backendFilters?.date_from ?? '') !== '' || (backendFilters?.date_to ?? '') !== '';

    function confirmarPausa(motivo: string) {
        if (!pausarOrden) return;

        pausaForm.transform(() => ({ motivo }));
        pausaForm.patch(`/ordenes/${pausarOrden.id}/pausar`, {
            preserveScroll: true,
            onSuccess: () => {
                setPausarOrden(null);
                pausaForm.reset();
            },
        });
    }

    function reanudarOrden(ordenId: number) {
        setReanudarOrdenId(ordenId);
        router.patch(`/ordenes/${ordenId}/reanudar`, {}, {
            preserveScroll: true,
            onFinish: () => setReanudarOrdenId(null),
        });
    }

    return (
        <DashboardLayout>
            <Head title="Órdenes de Trabajo - Taller" />

            <div className="mx-auto max-w-7xl">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Órdenes de Trabajo</h1>
                        <p className="mt-2 text-gray-600">
                            Gestión de taller · {ots.length} {ots.length === 1 ? 'orden' : 'órdenes'}
                        </p>
                    </div>
                </div>

                {/* Filtros */}
                <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                    {/* Fila 1: Búsqueda */}
                    <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Buscar (OT / Patente / Titular)</label>
                        <input
                            value={searchQ}
                            onChange={(e) => setSearchQ(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') applyFilters(); }}
                            placeholder="Ej: 12, EYZ529 o Gomez"
                            className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-200"
                        />
                    </div>

                    {/* Fila 2: Presets rápidos + Desde/Hasta + Aplicar/Limpiar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => applyFilters({ date_from: todayISO, date_to: todayISO })}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Hoy
                        </button>
                        <button
                            type="button"
                            onClick={() => applyFilters({ date_from: yesterdayISO, date_to: yesterdayISO })}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Ayer
                        </button>
                        <button
                            type="button"
                            onClick={() => applyFilters({ date_from: last7ISO, date_to: todayISO })}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Últimos 7 días
                        </button>

                        <div className="mx-1 hidden h-6 w-px bg-gray-300 sm:block" />

                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">Desde</span>
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="rounded-lg border border-gray-400 bg-white px-2 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-gray-200"
                            />
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">Hasta</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="rounded-lg border border-gray-400 bg-white px-2 py-2 text-sm text-gray-700 focus:border-gray-500 focus:ring-gray-200"
                            />
                        </div>

                        <div className="flex-1" />

                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="rounded-lg bg-gray-900 px-4 py-2 font-medium text-white transition hover:bg-black"
                        >
                            Aplicar
                        </button>
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
                        >
                            Limpiar
                        </button>
                    </div>

                    {/* Fila 3: Botones de estado */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
                        <span className="text-xs font-medium text-gray-500">Filtrar por estado:</span>
                        {estados.map((estado) => {
                            const isActive = activeEstadoId === estado.id;
                            const style = getFilterStyle(estado.nombre);
                            return (
                                <button
                                    key={estado.id}
                                    onClick={() => toggleEstadoFilter(estado.id)}
                                    className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                        isActive ? style.active : style.inactive
                                    }`}
                                >
                                    {estado.nombre}
                                    {isActive && <X className="h-3.5 w-3.5 ml-0.5" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Contenido */}
                {ots.length === 0 ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-lg">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                            <Car className="h-8 w-8 text-gray-400" />
                        </div>
                        <p className="text-lg font-semibold text-gray-500 mb-2">No hay órdenes para mostrar</p>
                        <p className="text-sm text-gray-400 mb-4">
                            {hasActiveFilters
                                ? 'Probá ajustando los filtros de búsqueda.'
                                : 'Cuando ingresen nuevas órdenes de trabajo aparecerán acá.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                        {/* Tabla Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">OT</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titular</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehículo</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {ots.map((ot) => (
                                        <tr key={ot.id} className={`transition ${ot.estado.nombre === 'Pausada' ? 'bg-violet-50 hover:bg-violet-100' : 'hover:bg-gray-50'}`}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                                #{ot.id}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {new Date(ot.fecha).toLocaleDateString('es-AR')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {ot.titular_vehiculo?.titular
                                                    ? `${ot.titular_vehiculo.titular.nombre} ${ot.titular_vehiculo.titular.apellido}`
                                                    : <span className="text-gray-400 italic">Sin titular</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ot.titular_vehiculo?.vehiculo ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="inline-block rounded bg-gray-800 px-2.5 py-1 font-mono text-sm font-bold text-white tracking-wider">
                                                            {ot.titular_vehiculo.vehiculo.patente}
                                                        </span>
                                                        <span className="text-sm text-gray-500">
                                                            {getNombre(ot.titular_vehiculo.vehiculo.marca)} {getNombre(ot.titular_vehiculo.vehiculo.modelo)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-gray-400 italic">Sin vehículo</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2.5 py-1 rounded text-xs font-semibold ${getBadgePill(ot.estado.nombre)}`}>
                                                    {ot.estado.nombre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/taller/ordenes/${ot.id}`}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
                                                    >
                                                        Ver orden
                                                        <ArrowRight className="h-3.5 w-3.5" />
                                                    </Link>
                                                    {ot.estado.nombre === 'Pausada' ? (
                                                        <button
                                                            onClick={() => reanudarOrden(ot.id)}
                                                            disabled={reanudarOrdenId === ot.id}
                                                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                                        >
                                                            <PlayCircle className="h-3.5 w-3.5" />
                                                            {reanudarOrdenId === ot.id ? 'Reanudando…' : 'Reanudar'}
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => setPausarOrden(ot)}
                                                                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3.5 py-1.5 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                                            >
                                                                <PauseCircle className="h-3.5 w-3.5" />
                                                                Pausar
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setOrdenSeleccionada(ot);
                                                                    setEstadoId(ot.estado.id);
                                                                    setOpen(true);
                                                                }}
                                                                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                                                            >
                                                                Cambiar estado
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Cards Mobile */}
                        <div className="md:hidden divide-y divide-gray-200">
                            {ots.map((ot) => (
                                <div key={ot.id} className={`p-4 space-y-3 ${ot.estado.nombre === 'Pausada' ? 'bg-violet-50' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-gray-900">OT #{ot.id}</span>
                                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBadgePill(ot.estado.nombre)}`}>
                                                {ot.estado.nombre}
                                            </span>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(ot.fecha).toLocaleDateString('es-AR')}
                                        </span>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <User className="h-4 w-4 text-gray-400 shrink-0" />
                                            {ot.titular_vehiculo?.titular
                                                ? `${ot.titular_vehiculo.titular.nombre} ${ot.titular_vehiculo.titular.apellido}`
                                                : <span className="text-gray-400 italic">Sin titular</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Car className="h-4 w-4 text-gray-400 shrink-0" />
                                            {ot.titular_vehiculo?.vehiculo ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-block rounded bg-gray-800 px-2 py-0.5 font-mono text-xs font-bold text-white tracking-wider">
                                                        {ot.titular_vehiculo.vehiculo.patente}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {getNombre(ot.titular_vehiculo.vehiculo.marca)} {getNombre(ot.titular_vehiculo.vehiculo.modelo)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic">Sin vehículo</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Link
                                            href={`/taller/ordenes/${ot.id}`}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                                        >
                                            Ver orden
                                            <ArrowRight className="h-3.5 w-3.5" />
                                        </Link>
                                        {ot.estado.nombre === 'Pausada' ? (
                                            <button
                                                onClick={() => reanudarOrden(ot.id)}
                                                disabled={reanudarOrdenId === ot.id}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                                            >
                                                <PlayCircle className="h-3.5 w-3.5" />
                                                {reanudarOrdenId === ot.id ? 'Reanudando…' : 'Reanudar'}
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => setPausarOrden(ot)}
                                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
                                                >
                                                    <PauseCircle className="h-3.5 w-3.5" />
                                                    Pausar
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setOrdenSeleccionada(ot);
                                                        setEstadoId(ot.estado.id);
                                                        setOpen(true);
                                                    }}
                                                    className="flex-1 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                                                >
                                                    Cambiar estado
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-6 py-4">
                            <div className="text-sm text-gray-600">
                                Mostrando <span className="font-medium text-gray-900">{ots.length}</span> {ots.length === 1 ? 'orden' : 'órdenes'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Cambiar Estado */}
            {open && ordenSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
                    <div
                        className="w-full max-w-md mx-4 rounded-xl bg-white p-6 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-bold text-gray-900">Cambiar estado de OT #{ordenSeleccionada.id}</h3>

                        <div className="mt-4 space-y-2">
                            {estadosCambio.map((estado) => {
                                const isSelected = estadoId === estado.id;
                                const pillColor = getBadgePill(estado.nombre);
                                return (
                                    <button
                                        key={estado.id}
                                        type="button"
                                        onClick={() => setEstadoId(estado.id)}
                                        className={`flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${pillColor}`}>
                                            {estado.nombre}
                                        </span>
                                        {isSelected && (
                                            <span className="ml-auto text-blue-600 font-semibold text-sm">✓ Seleccionado</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setOpen(false);
                                    setOrdenSeleccionada(null);
                                    setEstadoId(null);
                                }}
                                className="rounded-lg border border-gray-400 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={() => {
                                    if (!estadoId) {
                                        toast.error('Seleccioná un estado');
                                        return;
                                    }

                                    router.patch(
                                        `/taller/ordenes/${ordenSeleccionada.id}/estado`,
                                        { estado_id: estadoId },
                                        {
                                            preserveScroll: true,
                                            onSuccess: () => {
                                                toast.success('Estado actualizado correctamente');
                                                setOpen(false);
                                                setOrdenSeleccionada(null);
                                                setEstadoId(null);
                                            },
                                            onError: () => {
                                                toast.error('No se pudo actualizar el estado');
                                            },
                                        },
                                    );
                                }}
                                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition hover:bg-black"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {pausarOrden && (
                <ConfirmPausaModal
                    open={true}
                    onClose={() => {
                        setPausarOrden(null);
                        pausaForm.clearErrors();
                    }}
                    onConfirm={confirmarPausa}
                    ordenId={pausarOrden.id}
                    processing={pausaForm.processing}
                    error={pausaForm.errors.motivo || (pausaForm.errors as Record<string, string>).estado}
                />
            )}
        </DashboardLayout>
    );
}
