import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Loader2, PauseCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MOTIVO_PAUSA_MAX = 500;

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    ordenId: number;
    processing?: boolean;
    error?: string;
    warnUnsavedChanges?: boolean;
};

export default function ConfirmPausaModal({ open, onClose, onConfirm, ordenId, processing = false, error, warnUnsavedChanges = false }: Props) {
    const [motivo, setMotivo] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (!open) return;

        setMotivo('');
        const id = window.setTimeout(() => textareaRef.current?.focus(), 80);
        return () => window.clearTimeout(id);
    }, [open, ordenId]);

    const largo = motivo.trim().length;

    return (
        <Dialog open={open} onOpenChange={(value) => !value && !processing && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
                        <PauseCircle className="h-7 w-7 text-violet-700" />
                    </div>
                    <DialogTitle className="text-center text-xl">¿Pausar Orden #{ordenId}?</DialogTitle>
                    <DialogDescription className="mt-2 text-center text-gray-600">
                        La orden quedará disponible sólo para consulta hasta que sea reanudada.
                    </DialogDescription>
                </DialogHeader>

                {warnUnsavedChanges && (
                    <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        Los cambios sin guardar de esta edición se descartarán.
                    </div>
                )}

                <div>
                    <label htmlFor="motivo-pausa" className="mb-1.5 block text-sm font-medium text-gray-700">
                        Motivo de la pausa <span className="font-normal text-gray-400">(opcional)</span>
                    </label>
                    <textarea
                        id="motivo-pausa"
                        ref={textareaRef}
                        rows={3}
                        value={motivo}
                        maxLength={MOTIVO_PAUSA_MAX}
                        disabled={processing}
                        onChange={(event) => setMotivo(event.target.value)}
                        placeholder="Ej: esperando un repuesto o confirmación del cliente."
                        className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50"
                    />
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                        <p className="text-xs text-red-600" role={error ? 'alert' : undefined}>
                            {error}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                            {largo} / {MOTIVO_PAUSA_MAX}
                        </span>
                    </div>
                </div>

                <DialogFooter className="flex gap-3 sm:justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={() => !processing && onConfirm(motivo.trim())}
                        disabled={processing}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PauseCircle className="h-4 w-4" />}
                        {processing ? 'Pausando…' : 'Sí, pausar'}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
