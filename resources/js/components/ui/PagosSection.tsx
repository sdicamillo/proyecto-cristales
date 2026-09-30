import React, { useState } from 'react';
import { Plus, Trash2, Calendar, CreditCard, DollarSign, AlertCircle, CheckCircle, Zap, Lock } from 'lucide-react';
import { getArgentinaToday } from '@/utils/dateFormat';
import { ordenarPorEtiqueta } from '@/lib/utils';

type Pago = {
    id?: number; // NUEVO: Para identificar pagos existentes
    medio_de_pago_id: number | string;
    monto: number | string;
    fecha: string;
    observacion: string;
    pagado: boolean;
    bloqueado?: boolean; // NUEVO: Indica si el pago está bloqueado
    monto_usd?: number | string | null;
    tipo_cambio?: number | string | null;
};

type MedioDePago = { id: number; nombre: string; moneda?: string };

type Props = {
    pagos: Pago[];
    setPagos: (pagos: Pago[]) => void;
    mediosDePago: MedioDePago[];
    totalOrden: number;
    errors?: Record<string, string>;
    modoEdicion?: boolean; // NUEVO: Para saber si estamos editando una OT existente
};

export default function PagosSection({ 
    pagos, 
    setPagos, 
    mediosDePago, 
    totalOrden, 
    errors = {}, 
    modoEdicion = false 
}: Props) {
    // Calcular totales (considerando negativos)
    const totalPagado = pagos
        .filter(p => p.pagado === true)
        .reduce((acc, p) => acc + Number(p.monto || 0), 0);
    
    const totalRegistrado = pagos.reduce((acc, p) => acc + Number(p.monto || 0), 0);
    const saldoPendiente = totalOrden - totalPagado;
    const porcentajePagado = totalOrden > 0 ? (totalPagado / totalOrden) * 100 : 0;

    const esEnDolares = (medioId: number | string) =>
        mediosDePago.find((mp) => String(mp.id) === String(medioId))?.moneda === 'USD';

    // En pagos en USD el monto en pesos se calcula: monto USD × tipo de cambio
    const calcularMontoPesos = (montoUsd: unknown, tipoCambio: unknown): number | string => {
        if (montoUsd === '' || montoUsd == null || tipoCambio === '' || tipoCambio == null) return '';
        return Math.round(Number(montoUsd) * Number(tipoCambio) * 100) / 100;
    };

    const nuevoPago: Pago = {
        medio_de_pago_id: '',
        monto: '',
        monto_usd: '',
        tipo_cambio: '',
        fecha: getArgentinaToday(), 
        observacion: '',
        pagado: false,
        bloqueado: false,
    };

    const agregarPago = () => {
        setPagos([...pagos, { ...nuevoPago }]);
    };

    const eliminarPago = (index: number) => {
        const pago = pagos[index];
        
        // No permitir eliminar pagos bloqueados
        if (pago.bloqueado) {
            alert('No se puede eliminar un pago ya cobrado y bloqueado.');
            return;
        }
        
        setPagos(pagos.filter((_, i) => i !== index));
    };

    const actualizarPago = (index: number, campo: keyof Pago, valor: any) => {
        const pago = pagos[index];
        
        // No permitir modificar pagos bloqueados
        if (pago.bloqueado) {
            alert('No se puede modificar un pago ya cobrado y bloqueado.');
            return;
        }
        
        const nuevosPagos = [...pagos];
        const actualizado: Pago = { ...nuevosPagos[index], [campo]: valor };

        if (esEnDolares(actualizado.medio_de_pago_id)) {
            actualizado.monto = calcularMontoPesos(actualizado.monto_usd, actualizado.tipo_cambio);
        } else if (campo === 'medio_de_pago_id') {
            if (esEnDolares(pago.medio_de_pago_id)) actualizado.monto = '';
            actualizado.monto_usd = '';
            actualizado.tipo_cambio = '';
        }

        nuevosPagos[index] = actualizado;
        setPagos(nuevosPagos);
    };

    const getEstadoPago = () => {
        if (totalPagado === 0) return { color: 'red', texto: 'Sin pagos', icon: AlertCircle };
        if (saldoPendiente > 0) return { color: 'yellow', texto: 'Pago parcial', icon: AlertCircle };
        if (saldoPendiente === 0) return { color: 'green', texto: 'Pagado totalmente', icon: CheckCircle };
        if (saldoPendiente < 0) return { color: 'blue', texto: 'Sobrepago', icon: AlertCircle };
        return { color: 'green', texto: 'Pagado totalmente', icon: CheckCircle };
    };

    const estadoPago = getEstadoPago();
    const Icon = estadoPago.icon;

    // Función para completar con el total o restante
    const completarMonto = (index: number) => {
        const montosAnteriores = pagos
            .slice(0, index)
            .reduce((acc, p) => acc + Number(p.monto || 0), 0);
        
        const restante = totalOrden - montosAnteriores;
        const pago = pagos[index];

        if (esEnDolares(pago.medio_de_pago_id)) {
            const tipoCambio = Number(pago.tipo_cambio);
            actualizarPago(index, 'monto_usd', restante > 0 ? Math.round((restante / tipoCambio) * 100) / 100 : 0);
            return;
        }

        actualizarPago(index, 'monto', restante > 0 ? restante : 0);
    };

    return (
        <div className="space-y-6">
            {/* Header con estado visual */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <DollarSign className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Pagos y Facturación</h3>
                        <p className="text-sm text-gray-500">
                            {modoEdicion 
                                ? 'Los pagos bloqueados (🔒) no pueden modificarse. Podés agregar nuevos pagos.'
                                : 'Registrá los pagos y marcá cuando se cobren'}
                        </p>
                    </div>
                </div>

                {/* Badge de estado */}
                <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 ${
                        estadoPago.color === 'green'
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : estadoPago.color === 'yellow'
                            ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                            : estadoPago.color === 'red'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                    }`}
                >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-semibold">{estadoPago.texto}</span>
                </div>
            </div>

            {/* Resumen visual del pago */}
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                    <div>
                        <p className="text-sm text-slate-600 mb-1">Total de la orden</p>
                        <p className="text-2xl font-bold text-slate-900">${totalOrden.toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600 mb-1">Total cobrado</p>
                        <p className="text-2xl font-bold text-green-600">${totalPagado.toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600 mb-1">Registrado (sin cobrar)</p>
                        <p className="text-2xl font-bold text-blue-600">${(totalRegistrado - totalPagado).toLocaleString('es-AR')}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-600 mb-1">Saldo pendiente</p>
                        <p className={`text-2xl font-bold ${saldoPendiente > 0 ? 'text-red-600' : saldoPendiente < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                            ${Math.abs(saldoPendiente).toLocaleString('es-AR')}
                        </p>
                    </div>
                </div>

                {/* Barra de progreso */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Progreso de cobro</span>
                        <span className="font-semibold text-slate-900">{Math.min(porcentajePagado, 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${
                                porcentajePagado >= 100 ? 'bg-green-500' : porcentajePagado > 0 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(porcentajePagado, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista de pagos */}
            <div className="space-y-3">
                {pagos.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 text-sm">No hay pagos registrados</p>
                        <p className="text-slate-400 text-xs mt-1">Agregá el primer pago haciendo click en el botón de abajo</p>
                    </div>
                ) : (
                    pagos.map((pago, index) => {
                        // Calcular qué mostrar en el botón
                        const montosAnteriores = pagos
                            .slice(0, index)
                            .reduce((acc, p) => acc + Number(p.monto || 0), 0);
                        const restante = totalOrden - montosAnteriores;
                        const enDolares = esEnDolares(pago.medio_de_pago_id);
                        const mostrarBoton = enDolares
                            ? restante > 0 && !pago.monto_usd && Number(pago.tipo_cambio) > 0 && !pago.bloqueado
                            : restante > 0 && !pago.monto && !pago.bloqueado;
                        const textoBoton = index === 0 ? 'Total' : 'Restante';

                        const esBloqueado = pago.bloqueado === true;

                        return (
                            <div
                                key={pago.id || index}
                                className={`rounded-xl border-2 p-4 transition-all ${
                                    esBloqueado
                                        ? 'border-slate-300 bg-slate-50/50 opacity-75' // Estilo bloqueado
                                        : pago.pagado 
                                            ? 'border-green-200 bg-green-50/30' 
                                            : 'border-slate-200 bg-white hover:shadow-md'
                                }`}
                            >
                                {/* Badge de bloqueado */}
                                {esBloqueado && (
                                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
                                        <Lock className="h-3.5 w-3.5" />
                                        <span>Pago bloqueado - No se puede modificar</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                                    {/* Checkbox Pagado */}
                                    <div className="md:col-span-1 flex items-center justify-center pt-7">
                                        <label className={`flex flex-col items-center gap-1 ${esBloqueado ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <input
                                                type="checkbox"
                                                checked={pago.pagado}
                                                onChange={(e) => {
                                                    if (esBloqueado) return;
                                                    actualizarPago(index, 'pagado', e.target.checked);
                                                    if (e.target.checked && !pago.fecha) {
                                                        actualizarPago(index, 'fecha', getArgentinaToday()); // ← USA FECHA ARGENTINA
                                                    }
                                                }}
                                                disabled={esBloqueado}
                                                className="h-5 w-5 rounded border-gray-300 text-green-600 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <span className="text-xs text-slate-600 font-medium">
                                                {pago.pagado ? '✓ Cobrado' : 'Sin cobrar'}
                                            </span>
                                        </label>
                                    </div>

                                    {/* Fecha - SOLO SI ESTÁ MARCADO COMO PAGADO */}
                                    {pago.pagado && (
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Fecha del cobro *</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                                                <input
                                                    type="date"
                                                    value={pago.fecha}
                                                    max={new Date().toISOString().split('T')[0]}
                                                    onChange={(e) => actualizarPago(index, 'fecha', e.target.value)}
                                                    disabled={esBloqueado}
                                                    className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                                        errors[`pagos.${index}.fecha`] ? 'border-red-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                            {errors[`pagos.${index}.fecha`] && (
                                                <p className="text-xs text-red-500 mt-1">{errors[`pagos.${index}.fecha`]}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Medio de pago */}
                                    <div className={pago.pagado ? "md:col-span-3" : "md:col-span-4"}>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Medio de pago *</label>
                                        <select
                                            value={pago.medio_de_pago_id}
                                            onChange={(e) => actualizarPago(index, 'medio_de_pago_id', e.target.value)}
                                            disabled={esBloqueado}
                                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                                errors[`pagos.${index}.medio_de_pago_id`] ? 'border-red-300' : 'border-slate-200'
                                            }`}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {ordenarPorEtiqueta(mediosDePago, (mp) => mp.nombre).map((mp) => (
                                                <option key={mp.id} value={mp.id}>
                                                    {mp.nombre}
                                                </option>
                                            ))}
                                        </select>
                                        {errors[`pagos.${index}.medio_de_pago_id`] && (
                                            <p className="text-xs text-red-500 mt-1">{errors[`pagos.${index}.medio_de_pago_id`]}</p>
                                        )}
                                    </div>

                                    {/* Monto con botón Total/Restante */}
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                                            {enDolares ? 'Equivalente en pesos' : 'Monto *'} {Number(pago.monto) < 0 && <span className="text-red-600">(Negativo)</span>}
                                        </label>
                                        <div className="space-y-2">
                                            {/* Input de monto */}
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                                                <input
                                                    type="number"
                                                    value={pago.monto}
                                                    onChange={(e) => actualizarPago(index, 'monto', e.target.value)}
                                                    placeholder="0"
                                                    step="0.01"
                                                    disabled={esBloqueado}
                                                    readOnly={enDolares}
                                                    title={enDolares ? 'Se calcula con el monto en USD y el tipo de cambio' : undefined}
                                                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed read-only:bg-slate-50 ${
                                                        Number(pago.monto) < 0 ? 'text-red-600 font-semibold' : ''
                                                    } ${errors[`pagos.${index}.monto`] ? 'border-red-300' : 'border-slate-200'}`}
                                                />
                                            </div>
                                            
                                            {/* Botón Total/Restante */}
                                            {mostrarBoton && (
                                                <button
                                                    type="button"
                                                    onClick={() => completarMonto(index)}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all"
                                                >
                                                    <Zap className="h-3.5 w-3.5" />
                                                    {textoBoton}: ${restante.toLocaleString('es-AR')}
                                                    {enDolares && ` (US$ ${(Math.round((restante / Number(pago.tipo_cambio)) * 100) / 100).toLocaleString('es-AR')})`}
                                                </button>
                                            )}
                                        </div>
                                        {errors[`pagos.${index}.monto`] && (
                                            <p className="text-xs text-red-500 mt-1">{errors[`pagos.${index}.monto`]}</p>
                                        )}
                                    </div>

                                    {/* Observación */}
                                    <div className={pago.pagado ? "md:col-span-3" : "md:col-span-4"}>
                                        <label className="block text-xs font-medium text-slate-600 mb-1.5">Observación</label>
                                        <input
                                            type="text"
                                            value={pago.observacion}
                                            onChange={(e) => actualizarPago(index, 'observacion', e.target.value)}
                                            placeholder="Ej: Seña inicial"
                                            maxLength={255}
                                            disabled={esBloqueado}
                                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed"
                                        />
                                    </div>

                                    {/* Botón eliminar */}
                                    <div className="md:col-span-1 flex items-end justify-center">
                                        <button
                                            type="button"
                                            onClick={() => eliminarPago(index)}
                                            disabled={esBloqueado}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                                            title={esBloqueado ? "No se puede eliminar un pago bloqueado" : "Eliminar pago"}
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Datos del pago en dólares */}
                                {enDolares && (
                                    <div className="mt-4 grid grid-cols-1 gap-4 rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 md:grid-cols-3">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Monto en USD *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">US$</span>
                                                <input
                                                    type="number"
                                                    value={pago.monto_usd ?? ''}
                                                    onChange={(e) => actualizarPago(index, 'monto_usd', e.target.value)}
                                                    placeholder="0"
                                                    step="0.01"
                                                    disabled={esBloqueado}
                                                    className={`w-full pl-12 pr-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                                        errors[`pagos.${index}.monto_usd`] ? 'border-red-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                            {errors[`pagos.${index}.monto_usd`] && (
                                                <p className="text-xs text-red-500 mt-1">{errors[`pagos.${index}.monto_usd`]}</p>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-600 mb-1.5">Tipo de cambio (ARS por USD) *</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
                                                <input
                                                    type="number"
                                                    value={pago.tipo_cambio ?? ''}
                                                    onChange={(e) => actualizarPago(index, 'tipo_cambio', e.target.value)}
                                                    placeholder="0"
                                                    step="0.01"
                                                    min="0"
                                                    disabled={esBloqueado}
                                                    className={`w-full pl-7 pr-3 py-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                                        errors[`pagos.${index}.tipo_cambio`] ? 'border-red-300' : 'border-slate-200'
                                                    }`}
                                                />
                                            </div>
                                            {errors[`pagos.${index}.tipo_cambio`] && (
                                                <p className="text-xs text-red-500 mt-1">{errors[`pagos.${index}.tipo_cambio`]}</p>
                                            )}
                                        </div>
                                        <div className="flex flex-col justify-end">
                                            <p className="text-xs text-slate-600 mb-1.5">Equivalente en pesos</p>
                                            <p className="py-2 text-lg font-bold text-emerald-700">
                                                {pago.monto !== '' && pago.monto != null
                                                    ? `$${Number(pago.monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : '—'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Botón agregar pago */}
            <button
                type="button"
                onClick={agregarPago}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-xl border-2 border-blue-200 transition-all hover:border-blue-300"
            >
                <Plus className="h-5 w-5" />
                Agregar pago
            </button>

            {/* Info sobre pagos negativos */}
            {pagos.some(p => Number(p.monto) < 0) && (
                <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900">Pagos negativos detectados</p>
                        <p className="text-sm text-purple-700 mt-1">
                            Los montos negativos se usan para corregir errores de cobro. Se restan del total cobrado.
                        </p>
                    </div>
                </div>
            )}

            {/* Advertencia si no está completamente pagado */}
            {saldoPendiente > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">Pago incompleto</p>
                        <p className="text-sm text-amber-700 mt-1">
                            Falta cobrar ${saldoPendiente.toLocaleString('es-AR')} del total de la orden.
                            <span className="font-semibold"> No podrás finalizar la orden</span> hasta que esté completamente cobrada.
                        </p>
                    </div>
                </div>
            )}

            {/* Info sobre pagos registrados sin cobrar */}
            {totalRegistrado > totalPagado && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Pagos registrados pendientes</p>
                        <p className="text-sm text-blue-700 mt-1">
                            Hay ${(totalRegistrado - totalPagado).toLocaleString('es-AR')} en pagos registrados pero aún no cobrados.
                            Marcá el checkbox cuando se efectivice el cobro.
                        </p>
                    </div>
                </div>
            )}

            {/* Error general de pagos */}
            {errors.pagos && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">{errors.pagos}</p>
                </div>
            )}
        </div>
    );
}