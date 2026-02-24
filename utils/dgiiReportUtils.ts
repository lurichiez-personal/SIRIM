// src/utils/dgiiReportUtils.ts
import { Gasto, Factura, NotaCreditoDebito, Ingreso, Cliente, MetodoPago, isNcfConsumidorFinal, FacturaEstado, NCFType, Empresa } from "../types.ts";

/**
 * Función de descarga optimizada para la DGII.
 * Asegura CRLF y limpieza de caracteres especiales.
 */
const downloadTxtFile = (content: string, filename: string) => {
    // Asegurar saltos de línea CRLF para compatibilidad con DGII
    const cleanContent = content.replace(/\r?\n/g, '\r\n');
    const blob = new Blob([cleanContent], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const formatDate = (dateStr: string) => dateStr.replace(/-/g, '').trim();

/**
 * Formato Numérico SIRIM-DGII: 
 * - Si es entero, no pone decimales. Si tiene decimales, pone máximo 2.
 * - Utiliza Math.abs() porque la DGII requiere montos positivos en el TXT incluso para Notas de Crédito.
 * - Si el valor absoluto es 0, devuelve cadena vacía (requerido por el validador).
 */
const formatAmt = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    const absValue = Math.abs(value);
    // DGII prefiere cadenas vacías para valores cero en el TXT delimitado
    if (absValue < 0.01) return '';
    const rounded = Math.round(absValue * 100) / 100;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2);
};

/**
 * Determina el tipo de identificación.
 * 1 = RNC (9 dígitos)
 * 2 = Cédula (11 dígitos)
 * 3 = Pasaporte (Cualquier otra cosa con contenido)
 * '' = Vacío
 */
const getTipoId = (documento: string | undefined | null): string => {
    if (!documento || documento.trim() === '') return '';
    
    const cleanDoc = documento.replace(/[\s-]/g, '');
    
    if (/^\d+$/.test(cleanDoc)) {
        if (cleanDoc.length === 9) return '1';
        if (cleanDoc.length === 11) return '2';
    }
    
    // Si tiene contenido pero no encaja en RNC/Cédula, es Pasaporte
    if (cleanDoc.length > 0) return '3';
    
    return '';
};

const mapFormaDePagoToCode = (metodo: MetodoPago | string): string => {
    return metodo ? metodo.substring(0, 2) : '';
};

const isFiscalNCF = (ncf?: string): boolean => {
    if (!ncf) return false;
    const prefix = ncf.trim().toUpperCase().substring(0, 3);
    // Incluye Facturas de Crédito, Consumo, Notas, Regímenes Especiales y series Electrónicas
    return ['B01', 'B02', 'B03', 'B04', 'B11', 'B14', 'B15', 'E31', 'E32', 'E33', 'E34', 'E41', 'E44', 'E45'].includes(prefix);
};

export const generate607 = (facturas: Factura[], notas: NotaCreditoDebito[], ingresos: Ingreso[], clientes: Cliente[], rnc: string, periodo: string) => {
    // ... (Código existente de generate607)
    const cleanCompanyRnc = rnc.replace(/[^0-9]/g, '').trim();
    const cleanPeriodo = periodo.trim();
    
    const records = [
        ...facturas.filter(f => f.estado !== FacturaEstado.Anulada && isFiscalNCF(f.ncf)).map(f => ({ 
            ...f, recordType: 'factura' as const, modNCF: f.ncfModificado || '' 
        })),
        ...notas.filter(n => isFiscalNCF(n.ncf)).map(n => ({ 
            ...n, recordType: 'nota' as const, modNCF: n.facturaAfectadaNCF || '' 
        }))
    ];
    
    const header = `607|${cleanCompanyRnc}|${cleanPeriodo}|${records.length}`;
    
    const lines = records.map(rec => {
        const cliente = clientes.find(c => c.id === rec.clienteId);
        
        const rawRnc = (cliente?.rnc || '').trim();
        let tipoId = getTipoId(rawRnc);
        let rncClienteFinal = rawRnc.replace(/[\s-]/g, '');
        
        if (rncClienteFinal === '') {
            tipoId = '';
        } else if (tipoId === '1' || tipoId === '2') {
            rncClienteFinal = rncClienteFinal.replace(/[^0-9]/g, '');
        }

        const itbisRetenidoVal = rec.recordType === 'factura' ? ((rec as Factura).itbisRetenido || 0) : 0;
        const fechaRetencion = itbisRetenidoVal > 0 ? formatDate(rec.fecha) : '';

        const pagosAsociados = ingresos.filter(i => i.facturaId === rec.id);
        let efectivo = 0, bancos = 0, tarjeta = 0, credito = 0, bonos = 0, permuta = 0, otros = 0;

        if (pagosAsociados.length === 0) {
            credito = rec.montoTotal;
        } else {
            const sumPagos = pagosAsociados.reduce((s, p) => s + p.monto, 0);
            pagosAsociados.forEach(p => {
                const cod = mapFormaDePagoToCode(p.metodoPago);
                if (cod === '01') efectivo += p.monto;
                else if (cod === '02') bancos += p.monto;
                else if (cod === '03') tarjeta += p.monto;
                else if (cod === '05') permuta += p.monto;
                else otros += p.monto;
            });
            
            if (Math.abs(sumPagos) < Math.abs(rec.montoTotal) - 0.01) {
                credito = Math.abs(rec.montoTotal) - Math.abs(sumPagos);
            }
        }

        const fields = [
            rncClienteFinal,
            tipoId,
            rec.ncf?.trim().toUpperCase() || '',
            rec.modNCF?.trim().toUpperCase() || '',
            '1',
            formatDate(rec.fecha),
            fechaRetencion,
            formatAmt(rec.subtotal),
            formatAmt(rec.itbis),
            formatAmt(itbisRetenidoVal),
            '', '', '',
            formatAmt((rec as any).isc || 0),
            '',
            formatAmt((rec as any).propinaLegal || 0),
            formatAmt(efectivo),
            formatAmt(bancos),
            formatAmt(tarjeta),
            formatAmt(credito),
            formatAmt(bonos),
            formatAmt(permuta),
            formatAmt(otros),
        ];
        
        return fields.join('|');
    });
    
    const finalContent = [header, ...lines].join('\r\n');
    downloadTxtFile(finalContent, `607_${cleanCompanyRnc}_${cleanPeriodo}.txt`);
};

export const calculate607Summary = (ventas: { facturas: Factura[], notas: NotaCreditoDebito[] }, ingresos: Ingreso[], start: string, end: string) => {
    // ... (Código existente de calculate607Summary)
    const processedRecords = [
        ...ventas.facturas.filter(f => f.estado !== FacturaEstado.Anulada && isFiscalNCF(f.ncf)).map(f => ({ 
            ...f, recordType: 'factura' as const, modNCF: f.ncfModificado || ''
        })),
        ...ventas.notas.filter(n => isFiscalNCF(n.ncf)).map(n => ({ 
            ...n, recordType: 'nota' as const, modNCF: n.facturaAfectadaNCF || ''
        }))
    ].filter(rec => rec.fecha >= start && rec.fecha <= end);

    const resumen = processedRecords.reduce((acc, r) => ({
        cantidad: acc.cantidad + 1,
        montoFacturado: acc.montoFacturado + Math.abs(r.subtotal),
        itbisFacturado: acc.itbisFacturado + Math.abs(r.itbis),
        itbisRetenido: acc.itbisRetenido + (r.recordType === 'factura' ? Math.abs((r as Factura).itbisRetenido || 0) : 0),
        isc: acc.isc + Math.abs((r as any).isc || 0),
        otrosImpuestos: acc.otrosImpuestos + 0,
        propina: acc.propina + Math.abs((r as any).propinaLegal || 0),
    }), { cantidad: 0, montoFacturado: 0, itbisFacturado: 0, itbisRetenido: 0, isc: 0, otrosImpuestos: 0, propina: 0 });

    const tipoVenta: Record<string, number> = { efectivo: 0, cheque: 0, tarjeta: 0, credito: 0, bonos: 0, permuta: 0, otras: 0 };

    processedRecords.forEach(r => {
        const pagos = ingresos.filter(i => i.facturaId === r.id);
        const absTotal = Math.abs(r.montoTotal);
        
        if (pagos.length === 0) {
            tipoVenta.credito += absTotal;
        } else {
            const sumPagos = pagos.reduce((s, p) => s + Math.abs(p.monto), 0);
            pagos.forEach(p => {
                const cod = mapFormaDePagoToCode(p.metodoPago);
                const absMonto = Math.abs(p.monto);
                if (cod === '01') tipoVenta.efectivo += absMonto;
                else if (cod === '02') tipoVenta.cheque += absMonto;
                else if (cod === '03') tipoVenta.tarjeta += absMonto;
                else if (cod === '05') tipoVenta.permuta += absMonto;
                else tipoVenta.otras += absMonto;
            });
            if (sumPagos < absTotal - 0.01) {
                tipoVenta.credito += (absTotal - sumPagos);
            }
        }
    });

    return { resumen, tipoVenta, records: processedRecords };
};

export const generate606 = (gastos: Gasto[], rnc: string, periodo: string) => {
    // ... (Código existente de generate606)
    const gastosValidos = gastos.filter(g => isFiscalNCF(g.ncf) && !isNcfConsumidorFinal(g.ncf));
    const cleanCompanyRnc = rnc.replace(/[^0-9]/g, '').trim();
    const cleanPeriodo = periodo.trim();
    const header = `606|${cleanCompanyRnc}|${cleanPeriodo}|${gastosValidos.length}`;
    
    const lines = gastosValidos.map(g => {
        const tipoBienServicio = g.categoriaGasto.substring(0, 2);
        const cleanRncProveedor = (g.rncProveedor || '').replace(/[^0-9]/g, '').trim();
        let mServ = 0, mBien = 0;
        if (tipoBienServicio === '09' || tipoBienServicio === '10') mBien = g.subtotal;
        else mServ = g.subtotal;

        return [
            cleanRncProveedor, getTipoId(cleanRncProveedor), tipoBienServicio, g.ncf?.trim() || '', '', 
            formatDate(g.fecha), g.fechaPago ? formatDate(g.fechaPago) : '', 
            formatAmt(mServ), formatAmt(mBien), formatAmt(g.subtotal), formatAmt(g.itbis),
            '', '', '', formatAmt(g.itbis), '', '', '', '', formatAmt(g.isc),
            '', formatAmt(g.propinaLegal), mapFormaDePagoToCode(g.metodoPago)
        ].join('|');
    });

    downloadTxtFile([header, ...lines].join('\r\n'), `606_${cleanCompanyRnc}_${cleanPeriodo}.txt`);
};

export const generate608 = (anulados: (Factura | NotaCreditoDebito)[], rnc: string, periodo: string) => {
    // ... (Código existente de generate608)
    const anuladosValidos = anulados.filter(f => f.ncf && f.ncf.length > 0);
    const cleanCompanyRnc = rnc.replace(/[^0-9]/g, '').trim();
    const header = `608|${cleanCompanyRnc}|${periodo.trim()}|${anuladosValidos.length}`;
    const lines = anuladosValidos.map(f => [f.ncf?.trim().toUpperCase(), formatDate(f.fecha), '01', ''].join('|'));
    downloadTxtFile([header, ...lines].join('\r\n'), `608_${cleanCompanyRnc}_${periodo.trim()}.txt`);
};

export const generateIR3 = (nomina: any, empleados: any[], rnc: string, periodo: string) => {
    const lines = nomina.empleados.map((emp: any) => {
        if (emp.isr > 0) {
            const empData = empleados.find(e => e.id === emp.empleadoId);
            const ced = (empData?.cedula || '').replace(/[^0-9]/g, '').trim();
            if (ced) return [ced, formatAmt(emp.isr)].join('|');
        }
        return null;
    }).filter(Boolean);
    downloadTxtFile((lines as string[]).join('\r\n'), `IR3_${rnc.replace(/[^0-9]/g, '')}_${periodo.trim()}.txt`);
};

export const calculateAnexoAandIT1 = (v: any, g: any, c: any, e: any, p: any) => ({ empresa: e, period: p, ventas: { totalOperaciones: 0, totalItbisFacturado: 0, itbisPercibido: 0 }, compras: { totalComprasBienes: 0, totalComprasServicios: 0, totalItbisPagado: 0, itbisRetenido: 0 }, liquidacion: { itbisPorPagar: 0, itbisDeducible: 0, saldoFavorAnterior: 0, itbisRetenidoPorTerceros: 0, impuestoAPagar: 0, nuevoSaldoAFavor: 0 } });
export const generateAnexoAandIT1Excel = (v: any, g: any, c: any, e: any, p: any) => {};

// --- NUEVA LÓGICA IR-2 (DGII Rep. Dom.) ---

export const getAnexoBData = (periodo: number) => {
    // Esta función ahora es solo un wrapper o placeholder, la lógica real
    // de extracción de datos está en useDataStore.getAnexoBData
    return {}; 
};

export const getSuggestedIR2Adjustments = (periodo: number) => {
    return {
        gastosNoDeducibles: 0,
        otrosAjustesPositivos: 0,
        ajustesNegativos: 0
    };
};

export const calculateIR2 = (anexoB: any, anexoA: any, ajustes: any, datosAdicionales: any) => {
    // 1. Obtener la Utilidad (o Pérdida) Contable antes de Impuestos del Anexo B
    const utilidadContable = anexoB.utilidadNeta; // Ingresos - Costos - Gastos

    // 2. Aplicar Ajustes Fiscales (Gastos no admitidos)
    const gastosNoDeducibles = ajustes?.gastosNoDeducibles || 0;
    const otrosAjustesPositivos = ajustes?.otrosAjustesPositivos || 0;
    const ajustesNegativos = ajustes?.ajustesNegativos || 0; // Exenciones, etc.

    // 3. Determinar Renta Neta Imponible
    let rentaNetaImponible = utilidadContable + gastosNoDeducibles + otrosAjustesPositivos - ajustesNegativos;
    if (rentaNetaImponible < 0) rentaNetaImponible = 0; // Si hay pérdida fiscal, la base es 0 (se maneja pérdida arrastrable aparte)

    // 4. Calcular Impuesto Liquidado (Tasa actual: 27% para Personas Jurídicas)
    const tasaISR = 0.27;
    const impuestoLiquidado = rentaNetaImponible * tasaISR;

    // 5. Créditos y Pagos a Cuenta
    const anticiposPagados = datosAdicionales.anticiposPagados || 0;
    const saldoFavorAnterior = datosAdicionales.saldoFavorAnterior || 0;
    const retenciones = datosAdicionales.retenciones || 0; // Retenciones sufridas (e.g. intereses bancarios)

    const totalCreditos = anticiposPagados + saldoFavorAnterior + retenciones;

    // 6. Determinar Impuesto a Pagar o Saldo a Favor
    let impuestoAPagar = 0;
    let nuevoSaldoFavor = 0;

    if (impuestoLiquidado > totalCreditos) {
        impuestoAPagar = impuestoLiquidado - totalCreditos;
    } else {
        nuevoSaldoFavor = totalCreditos - impuestoLiquidado;
    }

    return {
        utilidadContable,
        gastosNoDeducibles,
        rentaNetaImponible,
        tasaISR,
        impuestoLiquidado,
        anticiposPagados,
        saldoFavorAnterior,
        retenciones,
        totalCreditos,
        impuestoAPagar,
        nuevoSaldoFavor,
        periodoFiscal: 0 // Placeholder
    };
};

export const generateIR2File = (result: any, empresa: Empresa, periodo: number) => {
    const lines = [
        `RNC: ${empresa.rnc}`,
        `Periodo Fiscal: ${periodo}`,
        `Razón Social: ${empresa.nombre}`,
        `----------------------------------------`,
        `RESUMEN DECLARACIÓN JURADA ANUAL IR-2`,
        `----------------------------------------`,
        `Utilidad Contable: ${formatAmt(result.utilidadContable)}`,
        `(+) Gastos No Deducibles: ${formatAmt(result.gastosNoDeducibles)}`,
        `(=) Renta Neta Imponible: ${formatAmt(result.rentaNetaImponible)}`,
        `(*) Tasa Impuesto: ${(result.tasaISR * 100).toFixed(0)}%`,
        `(=) Impuesto Liquidado: ${formatAmt(result.impuestoLiquidado)}`,
        `(-) Anticipos Pagados: ${formatAmt(result.anticiposPagados)}`,
        `(-) Saldo a Favor Anterior: ${formatAmt(result.saldoFavorAnterior)}`,
        `(-) Retenciones: ${formatAmt(result.retenciones)}`,
        `----------------------------------------`,
        `TOTAL A PAGAR: ${formatAmt(result.impuestoAPagar)}`,
        `SALDO A FAVOR: ${formatAmt(result.nuevoSaldoFavor)}`,
        `----------------------------------------`
    ];

    downloadTxtFile(lines.join('\r\n'), `RESUMEN_IR2_${empresa.rnc.replace(/[^0-9]/g,'')}_${periodo}.txt`);
};

export const generateAnexoBFile = (anexoB: any, empresa: Empresa, periodo: number) => {
    const lines = [
        `RNC: ${empresa.rnc}`,
        `Periodo: ${periodo}`,
        `ANEXO B - ESTADO DE RESULTADOS`,
        `----------------------------------------`,
        `Ingresos Operacionales: ${formatAmt(anexoB.totalIngresos)}`,
        `Costos de Venta: ${formatAmt(anexoB.totalCostos)}`,
        `(=) Utilidad Bruta: ${formatAmt(anexoB.utilidadBruta)}`,
        `Gastos Operacionales: ${formatAmt(anexoB.totalGastos)}`,
        `(=) Utilidad/Pérdida Neta: ${formatAmt(anexoB.utilidadNeta)}`
    ];
    downloadTxtFile(lines.join('\r\n'), `ANEXO_B_${empresa.rnc.replace(/[^0-9]/g,'')}_${periodo}.txt`);
};
