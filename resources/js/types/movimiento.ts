// resources/js/types/movimiento.ts

export interface Concepto {
    id: number;
    nombre: string;
    tipo: 'ingreso' | 'egreso';
}

export interface MedioDePago {
    id: number;
    nombre: string;
    moneda?: string; // 'ARS' | 'USD'
}

export interface Movimiento {
    id: number;
    fecha: string;
    monto: number;
    monto_usd?: number | null; // Solo en movimientos en dólares ("monto" es el equivalente en pesos)
    tipo_cambio?: number | null;
    tipo: 'ingreso' | 'egreso';
    comprobante?: string | null;
    orden_de_trabajo_id?: number | null; // NUEVO
    concepto_id: number;
    medio_de_pago_id: number | null;
    concepto?: {
        id: number;
        nombre: string;
        tipo: 'ingreso' | 'egreso';
    };
    medio_de_pago?: {
        id: number;
        nombre: string;
    }; // Cambiado de medioDePago a medio_de_pago
    comprobantes?: Array<{
        id: number;
        ruta_archivo: string;
    }>;
    // NUEVA RELACIÓN
    orden_de_trabajo?: {
        id: number;
        numero_orden?: string;
        fecha: string;
    }; 
    created_at: string;
    updated_at: string;
}

export interface MovimientoFormData {
    fecha: string;
    monto: string | number;
    monto_usd: string | number;
    tipo_cambio: string | number;
    concepto_id: string | number;
    medio_de_pago_id: string | number;
    comprobantes: File[];
    orden_de_trabajo_id?: number | null; // Agregado para que sea compatible con tu lógica
}