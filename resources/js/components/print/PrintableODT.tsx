import React from "react";

interface Atributo {
    id: number;
    categoria: { id: number; nombre: string };
    subcategoria: { id: number; nombre: string };
}

interface Detalle {
    descripcion: string;
    valor: number;
    cantidad: number;
    colocacion_incluida: boolean;
    articulo: { id: number; nombre: string } | null;
    marca_articulo?: { id: number; nombre: string } | null;
    atributos: Atributo[];
}

interface Pago {
    id: number;
    valor: number;
    observacion: string | null;
    medio_de_pago: { nombre: string };
}

interface Orden {
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
}

interface Props {
    orden: Orden;
}

// Formateador de moneda sin decimales para impresión
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
};

export default function PrintableODT({ orden }: Props) {
    const totalOrden = orden.detalles.reduce((acc, curr) => {
        return acc + Number(curr.valor) * Number(curr.cantidad);
    }, 0);

    const totalPagado = orden.pagos.reduce((acc, curr) => acc + Number(curr.valor), 0);
    const saldoPendiente = totalOrden - totalPagado;
    const companiaNombre = orden.compania_seguro?.nombre ?? "Particular";
    const fechaFormateada = new Date(orden.fecha).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (
        <div className="print-only hidden print:block bg-white text-black" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', padding: '4mm' }}>
            {/* Header Compacto */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #1f2937', paddingBottom: '8px', marginBottom: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '20pt', fontWeight: 900, color: '#1f2937', margin: 0, letterSpacing: '-0.5px' }}>
                        ORDEN DE TRABAJO
                    </h1>
                    <p style={{ fontSize: '10pt', color: '#6b7280', margin: '2px 0 0 0' }}>Cristalería Automotor</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ background: '#1f2937', color: 'white', padding: '6px 16px', display: 'inline-block' }}>
                        <span style={{ fontSize: '18pt', fontWeight: 900 }}>#{orden.id}</span>
                    </div>
                    <p style={{ fontSize: '9pt', color: '#6b7280', margin: '4px 0 0 0' }}>Fecha: {fechaFormateada}</p>
                </div>
            </div>

            {/* Info Cliente, Vehículo y Estado - Layout Compacto */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {/* Cliente */}
                <div style={{ flex: 1, border: '1px solid #d1d5db', padding: '8px' }}>
                    <h3 style={{ fontSize: '8pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                        Cliente
                    </h3>
                    <p style={{ fontWeight: 700, fontSize: '11pt', margin: '0 0 2px 0' }}>
                        {orden.titular_vehiculo.titular.nombre} {orden.titular_vehiculo.titular.apellido}
                    </p>
                    <p style={{ fontSize: '9pt', color: '#374151', margin: 0 }}>Tel: {orden.titular_vehiculo.titular.telefono || "—"}</p>
                    {orden.titular_vehiculo.titular.email && (
                        <p style={{ fontSize: '8pt', color: '#6b7280', margin: '2px 0 0 0' }}>{orden.titular_vehiculo.titular.email}</p>
                    )}
                </div>

                {/* Vehículo */}
                <div style={{ flex: 1, border: '1px solid #d1d5db', padding: '8px' }}>
                    <h3 style={{ fontSize: '8pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px' }}>
                        Vehículo
                    </h3>
                    <p style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '14pt', letterSpacing: '2px', margin: '0 0 2px 0' }}>
                        {orden.titular_vehiculo.vehiculo.patente}
                    </p>
                    <p style={{ fontSize: '9pt', color: '#374151', margin: 0 }}>
                        {orden.titular_vehiculo.vehiculo.marca?.nombre || ""}{" "}
                        {orden.titular_vehiculo.vehiculo.modelo?.nombre || ""}{" "}
                        {orden.titular_vehiculo.vehiculo.anio || ""}
                    </p>
                </div>

                {/* Estado y Seguro */}
                <div style={{ width: '120px', border: '1px solid #d1d5db', padding: '8px', textAlign: 'center' }}>
                    <div style={{
                        padding: '4px 8px',
                        fontSize: '9pt',
                        fontWeight: 700,
                        borderRadius: '4px',
                        marginBottom: '6px',
                        background: orden.estado.nombre === "Entregado" ? '#dcfce7' : orden.estado.nombre === "Cancelado" ? '#fee2e2' : '#fef3c7',
                        color: orden.estado.nombre === "Entregado" ? '#166534' : orden.estado.nombre === "Cancelado" ? '#991b1b' : '#92400e'
                    }}>
                        {orden.estado.nombre.toUpperCase()}
                    </div>
                    <p style={{ fontSize: '7pt', color: '#6b7280', margin: 0 }}>Seguro:</p>
                    <p style={{ fontSize: '9pt', fontWeight: 600, margin: '2px 0 0 0' }}>{companiaNombre}</p>
                </div>
            </div>

            {/* Tabla de Detalles - Compacta */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '9pt' }}>
                <thead>
                    <tr style={{ background: '#e5e7eb' }}>
                        <th style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'left', fontWeight: 700 }}>Descripción</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'center', fontWeight: 700, width: '50px' }}>Cant.</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right', fontWeight: 700, width: '80px' }}>P. Unit.</th>
                        <th style={{ border: '1px solid #9ca3af', padding: '6px 8px', textAlign: 'right', fontWeight: 700, width: '90px' }}>Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    {orden.detalles.map((detalle, index) => (
                        <tr key={index}>
                            <td style={{ border: '1px solid #d1d5db', padding: '5px 8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '10pt' }}>
                                    {detalle.articulo?.nombre || "Artículo"}
                                    {detalle.marca_articulo?.nombre ? ` (${detalle.marca_articulo.nombre})` : ""}
                                </span>
                                {detalle.atributos && detalle.atributos.length > 0 && (
                                    <span style={{ color: '#6b7280', fontSize: '8pt', marginLeft: '6px' }}>
                                        ({detalle.atributos.map(a => a.subcategoria?.nombre).join(", ")})
                                    </span>
                                )}
                                {detalle.descripcion && (
                                    <span style={{ display: 'block', fontSize: '8pt', color: '#6b7280', marginTop: '1px' }}>{detalle.descripcion}</span>
                                )}
                                <span style={{ fontSize: '8pt', color: '#6b7280' }}>
                                    {detalle.colocacion_incluida ? " ▸ Colocación" : " ▸ Retiro"}
                                </span>
                            </td>
                            <td style={{ border: '1px solid #d1d5db', padding: '5px 8px', textAlign: 'center' }}>{detalle.cantidad}</td>
                            <td style={{ border: '1px solid #d1d5db', padding: '5px 8px', textAlign: 'right' }}>
                                ${formatCurrency(Number(detalle.valor))}
                            </td>
                            <td style={{ border: '1px solid #d1d5db', padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                                ${formatCurrency(Number(detalle.valor) * Number(detalle.cantidad))}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{ background: '#f3f4f6' }}>
                        <td colSpan={3} style={{ border: '1px solid #9ca3af', padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '11pt' }}>
                            TOTAL:
                        </td>
                        <td style={{ border: '1px solid #9ca3af', padding: '8px', textAlign: 'right', fontWeight: 900, fontSize: '12pt' }}>
                            ${formatCurrency(totalOrden)}
                        </td>
                    </tr>
                </tfoot>
            </table>

            {/* Pagos y Saldo - Layout Compacto Horizontal */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {/* Pagos */}
                <div style={{ flex: 1, border: '1px solid #d1d5db', padding: '8px' }}>
                    <h3 style={{ fontSize: '8pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 6px 0' }}>
                        Pagos Registrados
                    </h3>
                    {orden.pagos.length > 0 ? (
                        <div>
                            {orden.pagos.map((pago) => (
                                <div key={pago.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9pt', marginBottom: '3px' }}>
                                    <span>{pago.medio_de_pago.nombre}</span>
                                    <span style={{ fontWeight: 600 }}>${formatCurrency(Number(pago.valor))}</span>
                                </div>
                            ))}
                            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '4px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '10pt' }}>
                                <span>Total Pagado:</span>
                                <span style={{ color: '#16a34a' }}>${formatCurrency(totalPagado)}</span>
                            </div>
                        </div>
                    ) : (
                        <p style={{ fontSize: '9pt', color: '#9ca3af', fontStyle: 'italic', margin: 0 }}>Sin pagos registrados</p>
                    )}
                </div>

                {/* Saldo Pendiente */}
                <div style={{ width: '140px', border: '3px solid #1f2937', padding: '10px', textAlign: 'center', background: '#f9fafb' }}>
                    <p style={{ fontSize: '8pt', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, margin: '0 0 4px 0' }}>Saldo Pendiente</p>
                    <p style={{ fontSize: '16pt', fontWeight: 900, margin: '0', color: saldoPendiente > 0 ? '#dc2626' : '#16a34a' }}>
                        ${formatCurrency(saldoPendiente)}
                    </p>
                    {saldoPendiente <= 0 && (
                        <span style={{ display: 'inline-block', background: '#16a34a', color: 'white', fontSize: '8pt', padding: '2px 10px', marginTop: '4px', fontWeight: 700 }}>
                            PAGADO
                        </span>
                    )}
                </div>
            </div>

            {/* Observaciones (solo si hay) */}
            {orden.observacion && (
                <div style={{ border: '1px solid #d1d5db', padding: '8px', marginBottom: '10px', background: '#f9fafb' }}>
                    <h3 style={{ fontSize: '8pt', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px 0' }}>Observaciones</h3>
                    <p style={{ fontSize: '9pt', color: '#374151', margin: 0 }}>{orden.observacion}</p>
                </div>
            )}

            {/* Footer con Firma */}
            <div style={{ borderTop: '2px solid #1f2937', paddingTop: '8px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '8pt', color: '#6b7280' }}>
                <div>
                    <p style={{ margin: 0 }}>Documento generado el {new Date().toLocaleDateString("es-AR")}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 600, margin: 0 }}>Firma del cliente: _______________________________</p>
                </div>
            </div>
        </div>
    );
}
