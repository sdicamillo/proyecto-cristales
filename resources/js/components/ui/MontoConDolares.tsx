type Monto = number | string | null | undefined;

const tieneValor = (valor: Monto) => valor !== null && valor !== undefined && valor !== '';

export function formatPesos(valor: Monto) {
    return `$${Number(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUsd(valor: Monto) {
    return `US$ ${Number(valor ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Total en dólares mostrado aparte del total en pesos (los pesos no lo incluyen).
 * No muestra nada si es cero.
 */
export function TotalDolares({ valor, className = 'text-emerald-700' }: { valor: Monto; className?: string }) {
    if (!Number(valor ?? 0)) return null;
    return <span className={`block font-bold ${className}`}>{formatUsd(valor)}</span>;
}

/**
 * Total agrupado con pesos y dólares por separado (sin equivalencias).
 * Muestra los pesos salvo que el grupo sea solo en dólares, y los dólares si hay.
 */
export function TotalSeparado({
    pesos,
    usd,
    formatMonto = (valor) => formatPesos(valor),
    className = '',
    usdClassName = 'text-emerald-700',
}: {
    pesos: Monto;
    usd?: Monto;
    formatMonto?: (valor: number) => string;
    className?: string;
    usdClassName?: string;
}) {
    const hayUsd = tieneValor(usd);
    const mostrarPesos = !hayUsd || Number(pesos ?? 0) !== 0;

    return (
        <span className="inline-flex flex-col items-end text-right">
            {mostrarPesos && <span className={className}>{formatMonto(Number(pesos ?? 0))}</span>}
            {hayUsd && <span className={`${className} ${usdClassName}`}>{formatUsd(usd)}</span>}
        </span>
    );
}

type Props = {
    monto: Monto;
    montoUsd?: Monto;
    tipoCambio?: Monto;
    className?: string;
    detalleClassName?: string;
    formatMonto?: (valor: number) => string;
    align?: 'left' | 'right';
};

/**
 * Muestra un monto en pesos, o, si el pago/movimiento fue en dólares,
 * "US$ X" como principal y debajo el equivalente en pesos con el tipo de cambio.
 */
export default function MontoConDolares({
    monto,
    montoUsd,
    tipoCambio,
    className = '',
    detalleClassName = 'text-xs font-normal text-gray-500',
    formatMonto = (valor) => formatPesos(valor),
    align = 'right',
}: Props) {
    if (!tieneValor(montoUsd)) {
        return <span className={className}>{formatMonto(Number(monto ?? 0))}</span>;
    }

    return (
        <span className={`inline-flex flex-col ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
            <span className={className}>{formatUsd(montoUsd)}</span>
            <span className={detalleClassName}>
                ≈ {formatMonto(Number(monto ?? 0))}
                {tieneValor(tipoCambio) && ` · TC ${formatPesos(tipoCambio)}`}
            </span>
        </span>
    );
}
