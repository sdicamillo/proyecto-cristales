import { useEffect, useRef } from 'react';

export type Responsable = { id: number; name: string };

type Props = {
    usuarios: Responsable[];
    estados: { id: number; nombre: string }[];
    formData: { estado_id: number | null; asignado_a_id: number | null; completado_por_id: number | null };
    setFormData: (patch: { asignado_a_id?: number | null; completado_por_id?: number | null }) => void;
    errors: Record<string, string>;
};

export default function ResponsablesSection({ usuarios, estados, formData, setFormData, errors }: Props) {
    const finalizada = ['Finalizada - Para Retirar', 'Retirada'].includes(
        estados.find(estado => estado.id === Number(formData.estado_id))?.nombre ?? '',
    );
    const estadoAnterior = useRef(false);

    useEffect(() => {
        if (finalizada && !estadoAnterior.current && !formData.completado_por_id && formData.asignado_a_id) {
            setFormData({ completado_por_id: formData.asignado_a_id });
        }
        estadoAnterior.current = finalizada;
    }, [finalizada, formData.asignado_a_id, formData.completado_por_id, setFormData]);

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div>
                <label htmlFor="asignado_a_id" className="mb-2 block text-sm font-semibold text-gray-800">Asignado a</label>
                <select id="asignado_a_id" value={formData.asignado_a_id ?? ''}
                    onChange={event => setFormData({ asignado_a_id: event.target.value ? Number(event.target.value) : null })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
                    <option value="">Sin asignar</option>
                    {usuarios.map(usuario => <option key={usuario.id} value={usuario.id}>{usuario.name}</option>)}
                </select>
                {errors.asignado_a_id && <p className="mt-2 text-sm text-red-600">{errors.asignado_a_id}</p>}
            </div>
            {(finalizada || formData.completado_por_id !== null) && <div>
                <label htmlFor="completado_por_id" className="mb-2 block text-sm font-semibold text-gray-800">Completado por{finalizada ? ' *' : ''}</label>
                <select id="completado_por_id" required={finalizada} value={formData.completado_por_id ?? ''}
                    onChange={event => setFormData({ completado_por_id: event.target.value ? Number(event.target.value) : null })}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900">
                    <option value="">Seleccioná quién realizó el trabajo</option>
                    {usuarios.map(usuario => <option key={usuario.id} value={usuario.id}>{usuario.name}</option>)}
                </select>
                <p className="mt-1 text-sm text-gray-500">Puede ser una persona distinta de la asignada.</p>
                {errors.completado_por_id && <p className="mt-2 text-sm text-red-600">{errors.completado_por_id}</p>}
            </div>}
        </div>
    );
}
