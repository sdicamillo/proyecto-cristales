import { formatPesos } from '@/components/ui/MontoConDolares';

type Valor = number | string | null | undefined;

/** Equivalente en pesos (monto USD × tipo de cambio), o '' si falta alguno de los dos. */
export function calcularMontoPesos(montoUsd: Valor, tipoCambio: Valor): number | '' {
    if (montoUsd === '' || montoUsd == null || tipoCambio === '' || tipoCambio == null) return '';
    return Math.round(Number(montoUsd) * Number(tipoCambio) * 100) / 100;
}

type Props = {
    montoUsd: Valor;
    tipoCambio: Valor;
    monto: Valor;
    onChange: (campo: 'monto_usd' | 'tipo_cambio', valor: string) => void;
    errors?: { monto_usd?: string; tipo_cambio?: string };
    focusClasses?: string;
};

/** Campos de monto en USD y tipo de cambio para movimientos en efectivo en dólares. */
export default function CamposDolares({ montoUsd, tipoCambio, monto, onChange, errors = {}, focusClasses = '' }: Props) {
    const inputClass = (error?: string) =>
        `w-full py-3 pr-4 bg-white border-2 rounded-xl focus:ring-2 ${focusClasses} outline-none transition text-gray-900 font-semibold ${
            error ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'
        }`;

    return (
        <div className="grid grid-cols-1 gap-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 md:grid-cols-3">
            <div>
                <label htmlFor="monto_usd" className="block text-sm font-semibold text-gray-800 mb-2">
                    Monto en USD *
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold">US$</span>
                    <input
                        id="monto_usd"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={montoUsd ?? ''}
                        onChange={(e) => onChange('monto_usd', e.target.value)}
                        className={`${inputClass(errors.monto_usd)} pl-14`}
                    />
                </div>
                {errors.monto_usd && <p className="mt-2 text-sm text-red-600">{errors.monto_usd}</p>}
            </div>
            <div>
                <label htmlFor="tipo_cambio" className="block text-sm font-semibold text-gray-800 mb-2">
                    Tipo de cambio (ARS por USD) *
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 font-bold">$</span>
                    <input
                        id="tipo_cambio"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={tipoCambio ?? ''}
                        onChange={(e) => onChange('tipo_cambio', e.target.value)}
                        className={`${inputClass(errors.tipo_cambio)} pl-10`}
                    />
                </div>
                {errors.tipo_cambio && <p className="mt-2 text-sm text-red-600">{errors.tipo_cambio}</p>}
            </div>
            <div className="flex flex-col justify-end">
                <p className="text-sm font-semibold text-gray-800 mb-2">Equivalente en pesos</p>
                <p className="py-3 text-xl font-bold text-emerald-700">
                    {monto !== '' && monto != null ? formatPesos(monto) : '—'}
                </p>
            </div>
        </div>
    );
}
