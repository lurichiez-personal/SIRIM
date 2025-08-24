import { Gasto, Factura, NotaCreditoDebito, MetodoPago, Cliente, FacturaEstado, NotaType } from '../types';
import { useDataStore } from '../stores/useDataStore';

const formatDGIIString = (str: string | undefined | null, length: number): string => {
    return (str || '').substring(0, length).padEnd(length, ' ');
};

const formatDGIINumber = (num: number | undefined | null, decimals: number = 2): string => {
    return (num || 0).toFixed(decimals);
};

const formatDGIIDate = (dateStr: string): string => {
    return dateStr.replace(/-/g, '');
};

const downloadTxtFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const getDescriptiveFilename = (tipo: '606' | '607' | '608', rnc: string, period: string): string => {
    const year = period.substring(0, 4);
    const month = parseInt(period.substring(4, 6), 10);
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    const monthName = monthNames[month - 1] || 'MesInvalido';
    return `Reporte ${tipo} - ${monthName} ${year} (RNC ${rnc}).txt`;
};


// --- Reporte 606 ---
export const generate606 = (gastos: Gasto[], rnc: string, period: string) => {
    const header = `606|${rnc}|${period}\n`;
    const details = gastos.map(g => {
        const rncProveedor = (g.rncProveedor || '').replace(/-/g, '');
        const tipoId = rncProveedor.length === 9 ? '1' : rncProveedor.length === 11 ? '2' : '';
        
        // Asumiendo Tipo de Bien/Servicio Comprado (hardcodeado a 1-Gastos por Trabajo Suministros y Servicios)
        // En una app real, esto debería ser configurable por gasto.
        const tipoBienServicio = g.categoriaGasto?.substring(0, 2) || '02';

        return [
            rncProveedor.padEnd(11),
            tipoId.padEnd(1),
            tipoBienServicio.padEnd(2),
            (g.ncf || '').padEnd(11),
            ''.padEnd(11), // NCF Modificado, usualmente vacío en 606
            formatDGIIDate(g.fecha),
            formatDGIINumber(g.itbis),
            '0.00', // ITBIS Retenido
            formatDGIINumber(g.subtotal),
            '0.00', // Monto Propina Legal
            '0.00', '0.00', '0.00', // Otros Impuestos
            '01' // Forma de Pago (hardcodeado)
        ].join('|');
    }).join('\n');

    const content = header + details;
    const filename = getDescriptiveFilename('606', rnc, period);
    downloadTxtFile(content, filename);
};

// --- Reporte 607 ---
export const generate607 = (facturas: Factura[], notas: NotaCreditoDebito[], rnc: string, period: string) => {
    const { clientes } = useDataStore.getState();
    const header = `607|${rnc}|${period}|${facturas.length + notas.length}\n`;
    
    const facturasDetails = facturas.map(f => {
        const cliente = clientes.find(c => c.id === f.clienteId);
        const clienteRNC = (cliente?.rnc || '').replace(/-/g, '');
        const tipoId = clienteRNC.length === 9 ? '1' : clienteRNC.length === 11 ? '2' : '';
        const tipoIngreso = '01'; // Hardcodeado a Ingresos por Operaciones
        
        const pagos = { efectivo: 0, cheque: 0, tarjeta: 0, credito: 0, bonos: 0, permuta: 0, otras: 0 };
        // Simple logic: if paid, assume it was by cheque/transfer, else it's on credit.
        if (f.montoPagado > 0) pagos.cheque = f.montoTotal;
        else pagos.credito = f.montoTotal;

        return [
            clienteRNC.padEnd(11),
            tipoId.padEnd(1),
            (f.ncf || '').padEnd(11),
            ''.padEnd(11), // NCF Modificado
            tipoIngreso,
            formatDGIIDate(f.fecha),
            formatDGIINumber(f.montoTotal),
            formatDGIINumber(f.itbis),
            '0.00', '0.00', '0.00', '0.00', // ITBIS Retenido, Percibido, etc.
            formatDGIINumber(f.isc),
            '0.00', // Otros Impuestos
            formatDGIINumber(f.propinaLegal),
            formatDGIINumber(pagos.efectivo),
            formatDGIINumber(pagos.cheque),
            formatDGIINumber(pagos.tarjeta),
            formatDGIINumber(pagos.credito),
            formatDGIINumber(pagos.bonos),
            formatDGIINumber(pagos.permuta),
            formatDGIINumber(pagos.otras),
        ].join('|');
    });
    
    const notasDetails = notas.map(n => {
        const cliente = clientes.find(c => c.id === n.clienteId);
        const clienteRNC = (cliente?.rnc || '').replace(/-/g, '');
        const tipoId = clienteRNC.length === 9 ? '1' : clienteRNC.length === 11 ? '2' : '';
        const tipoIngreso = '04'; // Ingresos por Notas de Crédito
        
        // For credit notes, all amounts are negative and the payment is zero.
        return [
            clienteRNC.padEnd(11),
            tipoId.padEnd(1),
            n.ncf.padEnd(11),
            n.facturaAfectadaNCF.padEnd(11), // NCF Modificado
            tipoIngreso,
            formatDGIIDate(n.fecha),
            formatDGIINumber(n.montoTotal * -1), // Negative amount
            formatDGIINumber(n.itbis * -1),      // Negative ITBIS
            '0.00', '0.00', '0.00', '0.00',
            formatDGIINumber((n.isc || 0) * -1),
            '0.00',
            formatDGIINumber((n.propinaLegal || 0) * -1),
            '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', // No payment method
        ].join('|');
    });

    const content = header + [...facturasDetails, ...notasDetails].join('\n');
    const filename = getDescriptiveFilename('607', rnc, period);
    downloadTxtFile(content, filename);
};

// --- Reporte 608 ---
export const generate608 = (anulados: { ncf: string, fecha: string }[], rnc: string, period: string) => {
    const header = `608|${rnc}|${period}|${anulados.length}\n`;
    const details = anulados.map(a => {
        const tipoAnulacion = '01'; // Hardcodeado a '01-Deterioro de Factura'
        return [
            a.ncf,
            formatDGIIDate(a.fecha),
            tipoAnulacion,
        ].join('|');
    }).join('\n');

    const content = header + details;
    const filename = getDescriptiveFilename('608', rnc, period);
    downloadTxtFile(content, filename);
};


// --- Anexo A / IT-1 Calculation ---
export const calculateAnexoA = (
    ventas: { facturas: Factura[], notas: NotaCreditoDebito[] },
    gastos: Gasto[]
) => {
    const totalFacturas = ventas.facturas.reduce((sum, f) => sum + f.montoTotal, 0);
    const itbisFacturas = ventas.facturas.reduce((sum, f) => sum + f.itbis, 0);
    
    const totalNotas = ventas.notas.reduce((sum, n) => sum + n.montoTotal, 0);
    const itbisNotas = ventas.notas.reduce((sum, n) => sum + n.itbis, 0);

    const totalVentasNeto = totalFacturas - totalNotas;
    const itbisVentas = itbisFacturas - itbisNotas;
    
    const totalCompras = gastos.reduce((sum, g) => sum + g.monto, 0);
    const itbisCompras = gastos.reduce((sum, g) => sum + g.itbis, 0);
    
    const itbisAPagar = itbisVentas - itbisCompras;

    return {
        totalVentasNeto,
        itbisVentas,
        totalCompras,
        itbisCompras,
        itbisAPagar,
    };
};