import React, { useEffect, useRef, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Ban, AlertTriangle, Loader2 } from "lucide-react";

export const MOTIVO_ANULACION_MIN = 5;
export const MOTIVO_ANULACION_MAX = 500;

type Props = {
    open: boolean;
    onClose: () => void;
    onConfirm: (motivo: string) => void;
    ordenId: number;
    /** Request en vuelo: bloquea el submit y muestra el spinner. */
    processing?: boolean;
    /** Error de validación devuelto por el backend. */
    error?: string;
};

export default function ConfirmAnularModal({
    open,
    onClose,
    onConfirm,
    ordenId,
    processing = false,
    error,
}: Props) {
    const [motivo, setMotivo] = useState("");
    const [touched, setTouched] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Cada apertura arranca limpia: el modal se reusa entre órdenes distintas.
    useEffect(() => {
        if (open) {
            setMotivo("");
            setTouched(false);
            const id = window.setTimeout(() => textareaRef.current?.focus(), 80);
            return () => window.clearTimeout(id);
        }
    }, [open, ordenId]);

    const largo = motivo.trim().length;
    const esValido = largo >= MOTIVO_ANULACION_MIN && largo <= MOTIVO_ANULACION_MAX;
    const errorLocal =
        touched && largo === 0
            ? "Tenés que indicar el motivo de la anulación."
            : touched && largo < MOTIVO_ANULACION_MIN
              ? `El motivo debe tener al menos ${MOTIVO_ANULACION_MIN} caracteres.`
              : null;
    const mensajeError = error ?? errorLocal;

    function handleConfirm() {
        setTouched(true);
        if (!esValido || processing) return;
        onConfirm(motivo.trim());
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        // Ctrl/Cmd + Enter confirma sin sacar las manos del teclado.
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            handleConfirm();
        }
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && !processing && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                        <AlertTriangle className="h-7 w-7 text-red-600" />
                    </div>
                    <DialogTitle className="text-center text-xl">
                        ¿Anular Orden #{ordenId}?
                    </DialogTitle>
                    <DialogDescription className="text-center text-gray-600 mt-2">
                        Esta acción no se puede deshacer. Si la orden ya generó ingresos en caja,
                        se crearán <strong className="text-gray-900">movimientos de reversa</strong> (egresos)
                        para compensar automáticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-2">
                    <label
                        htmlFor="motivo-anulacion"
                        className="mb-1.5 block text-sm font-medium text-gray-700"
                    >
                        Motivo de la anulación <span className="text-red-600">*</span>
                    </label>
                    <textarea
                        id="motivo-anulacion"
                        ref={textareaRef}
                        rows={3}
                        value={motivo}
                        maxLength={MOTIVO_ANULACION_MAX}
                        disabled={processing}
                        onChange={(e) => setMotivo(e.target.value)}
                        onBlur={() => setTouched(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ej: el cliente canceló el trabajo por presupuesto."
                        aria-invalid={mensajeError ? true : undefined}
                        aria-describedby={mensajeError ? "motivo-anulacion-error" : "motivo-anulacion-contador"}
                        className={`w-full resize-none rounded-xl border bg-white px-3 py-2.5 text-sm text-gray-900 shadow-sm transition placeholder:text-gray-400 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-50 ${
                            mensajeError
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-300 focus:border-red-400 focus:ring-red-100"
                        }`}
                    />
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                        <p
                            id="motivo-anulacion-error"
                            role={mensajeError ? "alert" : undefined}
                            className="text-xs text-red-600"
                        >
                            {mensajeError}
                        </p>
                        <span
                            id="motivo-anulacion-contador"
                            className={`shrink-0 text-xs tabular-nums ${
                                largo > MOTIVO_ANULACION_MAX - 50 ? "text-amber-600" : "text-gray-400"
                            }`}
                        >
                            {largo} / {MOTIVO_ANULACION_MAX}
                        </span>
                    </div>
                </div>

                <DialogFooter className="mt-2 flex gap-3 sm:justify-center">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={processing}
                        className="flex-1 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={processing || !esValido}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300 disabled:shadow-none"
                    >
                        {processing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Ban className="h-4 w-4" />
                        )}
                        {processing ? "Anulando…" : "Sí, anular"}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
