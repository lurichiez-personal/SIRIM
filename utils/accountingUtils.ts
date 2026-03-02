
import { Nomina, AsientoContable, Factura, Gasto, Ingreso, Item, MetodoPago, NotaCreditoDebito, Desvinculacion, Role } from '../types.ts';
import { useChartOfAccountsStore } from '../stores/useChartOfAccountsStore.ts';
import { roundToTwoDecimals } from './formatters.ts';
import { createContableEvent } from './contableEngine.ts';
import { useAuthStore } from '../stores/useAuthStore.ts';
import { validarEscrituraFiscal } from './fiscalEngine.ts';

const getCuenta = (id: string) => {
    const cuenta = useChartOfAccountsStore.getState().getCuentaById(id);
    if (!cuenta) throw new Error(`La cuenta contable con ID ${id} no existe en el catálogo. Verifique la configuración.`);
    return cuenta;
};

// Configuración de Cuentas por Defecto (Debe moverse a configuración de empresa en el futuro)
export const ACCOUNT_CONFIG = {
    ACTIVO_BANCO: '1101-02',
    ACTIVO_CXC: '1102-01',
    PASIVO_ITBIS: '2106-01',
    INGRESO_VENTAS: '4101-02',
    COSTO_VENTA: '5101-01',
    INVENTARIO: '1103-01',
    GASTO_GENERICO: '6102',
    ACTIVO_ITBIS_ADELANTADO: '1104-01',
    ACTIVO_ITBIS_RETENIDO: '1104-02',
    PASIVO_CXP: '2101-01'
};

const getCommonEventData = (empresaId: string, fecha: string, docId: string, docVersion: number = 1) => {
    const user = useAuthStore.getState().user;
    return {
        empresaId,
        periodoId: fecha.substring(0, 7), // YYYY-MM
        fechaContable: fecha,
        documentoOrigenId: docId,
        documentoVersion: docVersion,
        moneda: "DOP" as const,
        creadoPor: user?.id || 'system',
        rolCreador: (user?.roles.includes(Role.Contador) ? 'CONTADOR' : 'OPERATIVO') as "OPERATIVO" | "CONTADOR"
    };
};

export const generarAsientoPago = async (
    empresaId: string, 
    fecha: string, 
    descripcion: string, 
    transaccionId: string, 
    transaccionTipo: string, 
    monto: number,
    cuentaDebitoId: string,
    cuentaCreditoId: string = ACCOUNT_CONFIG.ACTIVO_BANCO 
): Promise<Omit<AsientoContable, 'id'>> => {
    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(empresaId, fecha, user?.id || 'system');

    const entradas = [
        { cuentaId: cuentaDebitoId, descripcion: getCuenta(cuentaDebitoId).nombre, debito: monto, credito: 0 },
        { cuentaId: cuentaCreditoId, descripcion: getCuenta(cuentaCreditoId).nombre, credito: monto, debito: 0 },
    ];

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(empresaId, fecha, transaccionId),
        tipoEvento: 'PAGO',
        subtipo: transaccionTipo.toUpperCase(),
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId,
        fecha,
        descripcion,
        transaccionId,
        transaccionTipo,
        entradas
    };
};

export const generarAsientoNomina = async (nomina: Nomina, empresaId: string): Promise<Omit<AsientoContable, 'id'>> => {
    const totalSalarioBruto = nomina.empleados.reduce((sum, e) => sum + e.salarioBruto, 0);
    const totalSfsEmpleado = nomina.empleados.reduce((sum, e) => sum + e.sfs, 0);
    const totalAfpEmpleado = nomina.empleados.reduce((sum, e) => sum + e.afp, 0);
    const totalIsr = nomina.empleados.reduce((sum, e) => sum + e.isr, 0);
    const totalSfsEmpleador = nomina.empleados.reduce((s,e) => s + e.sfsEmpleador, 0);
    const totalSrlEmpleador = nomina.empleados.reduce((s,e) => s + e.srlEmpleador, 0);
    const totalAfpEmpleador = nomina.empleados.reduce((s,e) => s + e.afpEmpleador, 0);
    const totalInfotep = nomina.empleados.reduce((s,e)=>s+e.infotep,0);

    const [year, month] = nomina.periodo.split('-').map(Number);
    const fechaAsiento = new Date(year, month, 0).toISOString().split('T')[0];

    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(empresaId, fechaAsiento, user?.id || 'system');

    const totalAportes = totalSfsEmpleado + totalAfpEmpleado + totalSfsEmpleador + totalAfpEmpleador + totalSrlEmpleador;

    const entradas = [
        { cuentaId: '6101-01', descripcion: getCuenta('6101-01').nombre, debito: totalSalarioBruto, credito: 0 },
        { cuentaId: '6101-02', descripcion: getCuenta('6101-02').nombre, debito: totalSfsEmpleador + totalSrlEmpleador + totalAfpEmpleador + totalInfotep, credito: 0 },
        { cuentaId: '2105-01', descripcion: getCuenta('2105-01').nombre, credito: totalAportes, debito: 0 },
        { cuentaId: '2105-02', descripcion: getCuenta('2105-02').nombre, credito: totalIsr, debito: 0 },
        { cuentaId: '2105-03', descripcion: getCuenta('2105-03').nombre, credito: totalInfotep, debito: 0 },
        { cuentaId: '2102-01', descripcion: getCuenta('2102-01').nombre, credito: nomina.totalPagado, debito: 0 },
    ].filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(empresaId, fechaAsiento, nomina.id),
        tipoEvento: 'NOMINA',
        subtipo: 'MENSUAL',
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId,
        fecha: fechaAsiento,
        descripcion: `Registro de nómina para el período ${nomina.periodo}`,
        transaccionId: nomina.id,
        transaccionTipo: 'nomina',
        entradas
    };
};

export const generarAsientoFacturaVenta = async (factura: Factura, items: Item[]): Promise<Omit<AsientoContable, 'id'>> => {
    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(factura.empresaId, factura.fecha, user?.id || 'system');

    // Determinar si es Contado o Crédito basado en el monto pagado
    const itbisRetenido = factura.itbisRetenido || 0;
    const montoACobrar = roundToTwoDecimals(factura.montoTotal - itbisRetenido);
    const esContado = factura.montoPagado >= (montoACobrar - 0.01);
    
    // Cuenta de Débito: Si es contado -> Banco/Caja, si es Crédito -> CxC
    const cuentaDebitoId = esContado ? ACCOUNT_CONFIG.ACTIVO_BANCO : ACCOUNT_CONFIG.ACTIVO_CXC;

    // Calcular Costo de Venta (solo si hay items asociados con inventario)
    const costoVenta = roundToTwoDecimals(factura.items.reduce((acc, facturaItem) => {
        const inventarioItem = items.find(i => i.id === facturaItem.itemId);
        if (inventarioItem && inventarioItem.cantidadDisponible !== undefined) {
             return acc + ((inventarioItem.costo || 0) * facturaItem.cantidad);
        }
        return acc;
    }, 0));

    const entradas = [
        // 1. Débito (Activo: Banco o CxC)
        { 
            cuentaId: cuentaDebitoId, 
            descripcion: getCuenta(cuentaDebitoId).nombre, 
            debito: montoACobrar, 
            credito: 0 
        },
        // 2. Crédito (Ingreso)
        { 
            cuentaId: ACCOUNT_CONFIG.INGRESO_VENTAS, 
            descripcion: getCuenta(ACCOUNT_CONFIG.INGRESO_VENTAS).nombre, 
            credito: factura.subtotal, 
            debito: 0 
        },
        // 3. Crédito (Pasivo: ITBIS)
        { 
            cuentaId: ACCOUNT_CONFIG.PASIVO_ITBIS, 
            descripcion: getCuenta(ACCOUNT_CONFIG.PASIVO_ITBIS).nombre, 
            credito: factura.itbis, 
            debito: 0 
        },
    ];

    if (itbisRetenido > 0) {
        entradas.push({
            cuentaId: ACCOUNT_CONFIG.ACTIVO_ITBIS_RETENIDO,
            descripcion: getCuenta(ACCOUNT_CONFIG.ACTIVO_ITBIS_RETENIDO).nombre,
            debito: itbisRetenido,
            credito: 0
        });
    }

    // Asiento de costo e inventario
    if (costoVenta > 0) {
        entradas.push({ 
            cuentaId: ACCOUNT_CONFIG.COSTO_VENTA, 
            descripcion: getCuenta(ACCOUNT_CONFIG.COSTO_VENTA).nombre, 
            debito: costoVenta, 
            credito: 0 
        });
        entradas.push({ 
            cuentaId: ACCOUNT_CONFIG.INVENTARIO, 
            descripcion: getCuenta(ACCOUNT_CONFIG.INVENTARIO).nombre, 
            credito: costoVenta, 
            debito: 0 
        });
    }
    
    const finalEntradas = entradas.filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(factura.empresaId, factura.fecha, factura.id),
        tipoEvento: 'FACTURA',
        subtipo: 'VENTA',
        entradas: finalEntradas,
        reversaEventoId: null
    });

    return {
        empresaId: factura.empresaId,
        fecha: factura.fecha,
        descripcion: `Venta según factura NCF ${factura.ncf} a ${factura.clienteNombre} (${esContado ? 'Contado' : 'Crédito'})`,
        transaccionId: String(factura.id),
        transaccionTipo: 'factura',
        entradas: finalEntradas,
    };
};

export const generarAsientoGasto = async (gasto: Gasto): Promise<Omit<AsientoContable, 'id'>> => {
    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(gasto.empresaId, gasto.fecha, user?.id || 'system');

    const cuentaGastoId = ACCOUNT_CONFIG.GASTO_GENERICO;
    const gastoReal = gasto.subtotal + (gasto.isc || 0) + (gasto.propinaLegal || 0);
    const cuentaAPagar = gasto.metodoPago === MetodoPago['04-COMPRA A CREDITO'] ? ACCOUNT_CONFIG.PASIVO_CXP : ACCOUNT_CONFIG.ACTIVO_BANCO;

    const entradas = [
        { cuentaId: cuentaGastoId, descripcion: getCuenta(cuentaGastoId).nombre, debito: gastoReal, credito: 0 },
        { cuentaId: ACCOUNT_CONFIG.ACTIVO_ITBIS_ADELANTADO, descripcion: getCuenta(ACCOUNT_CONFIG.ACTIVO_ITBIS_ADELANTADO).nombre, debito: gasto.itbis, credito: 0 },
        { cuentaId: cuentaAPagar, descripcion: getCuenta(cuentaAPagar).nombre, credito: gasto.monto, debito: 0 },
    ].filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(gasto.empresaId, gasto.fecha, gasto.id),
        tipoEvento: 'GASTO',
        subtipo: 'COMPRA',
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId: gasto.empresaId,
        fecha: gasto.fecha,
        descripcion: `Compra según NCF ${gasto.ncf} a ${gasto.proveedorNombre}`,
        transaccionId: String(gasto.id),
        transaccionTipo: 'gasto',
        entradas,
    };
};

export const generarAsientoIngreso = async (ingreso: Ingreso): Promise<Omit<AsientoContable, 'id'>> => {
     const user = useAuthStore.getState().user;
     await validarEscrituraFiscal(ingreso.empresaId, ingreso.fecha, user?.id || 'system');

     const cuentaEfectivoId = ACCOUNT_CONFIG.ACTIVO_BANCO; 
     const cuentaCxCId = ACCOUNT_CONFIG.ACTIVO_CXC;

    const entradas = [
        { cuentaId: cuentaEfectivoId, descripcion: getCuenta(cuentaEfectivoId).nombre, debito: ingreso.monto, credito: 0 },
        { cuentaId: cuentaCxCId, descripcion: getCuenta(cuentaCxCId).nombre, credito: ingreso.monto, debito: 0 },
    ].filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(ingreso.empresaId, ingreso.fecha, ingreso.id),
        tipoEvento: 'INGRESO',
        subtipo: 'COBRO',
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId: ingreso.empresaId,
        fecha: ingreso.fecha,
        descripcion: `Cobro de factura a ${ingreso.clienteNombre}`,
        transaccionId: String(ingreso.id),
        transaccionTipo: 'ingreso',
        entradas,
    };
};

export const generarAsientoNotaCredito = async (nota: NotaCreditoDebito): Promise<Omit<AsientoContable, 'id'>> => {
    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(nota.empresaId, nota.fecha, user?.id || 'system');

    const entradas = [
        { cuentaId: ACCOUNT_CONFIG.ACTIVO_CXC, descripcion: getCuenta(ACCOUNT_CONFIG.ACTIVO_CXC).nombre, credito: nota.montoTotal, debito: 0 },
        // Asumiendo devolución directa a ventas. En sistemas complejos iría a una cuenta de Devoluciones sobre Ventas.
        { cuentaId: ACCOUNT_CONFIG.INGRESO_VENTAS, descripcion: getCuenta(ACCOUNT_CONFIG.INGRESO_VENTAS).nombre, debito: nota.subtotal, credito: 0 },
        { cuentaId: ACCOUNT_CONFIG.PASIVO_ITBIS, descripcion: getCuenta(ACCOUNT_CONFIG.PASIVO_ITBIS).nombre, debito: nota.itbis, credito: 0 },
    ].filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(nota.empresaId, nota.fecha, nota.id),
        tipoEvento: 'NOTA',
        subtipo: nota.tipo === 'Credito' ? 'NOTA_CREDITO' : 'NOTA_DEBITO',
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId: nota.empresaId,
        fecha: nota.fecha,
        descripcion: `Nota de crédito NCF ${nota.ncf} a ${nota.clienteNombre}`,
        transaccionId: String(nota.id),
        transaccionTipo: 'nota_credito',
        entradas,
    };
};

export const generarAsientoDesvinculacion = async (desvinculacion: Desvinculacion): Promise<Omit<AsientoContable, 'id'>> => {
    const user = useAuthStore.getState().user;
    await validarEscrituraFiscal(desvinculacion.empresaId, desvinculacion.fechaSalida, user?.id || 'system');

    const totalPrestaciones = desvinculacion.prestaciones.total;
    const cuentaGastoId = '6101-03';
    const cuentaPorPagarId = ACCOUNT_CONFIG.PASIVO_CXP;

    const entradas = [
        { cuentaId: cuentaGastoId, descripcion: getCuenta(cuentaGastoId).nombre, debito: totalPrestaciones, credito: 0 },
        { cuentaId: cuentaPorPagarId, descripcion: getCuenta(cuentaPorPagarId).nombre, credito: totalPrestaciones, debito: 0 },
    ].filter(e => e.debito > 0 || e.credito > 0);

    // Generate Immutable Event
    await createContableEvent(null, {
        ...getCommonEventData(desvinculacion.empresaId, desvinculacion.fechaSalida, desvinculacion.id),
        tipoEvento: 'DESVINCULACION',
        subtipo: 'PRESTACIONES',
        entradas,
        reversaEventoId: null
    });

    return {
        empresaId: desvinculacion.empresaId,
        fecha: desvinculacion.fechaSalida,
        descripcion: `Provisión de prestaciones laborales para ${desvinculacion.empleadoNombre}`,
        transaccionId: String(desvinculacion.id),
        transaccionTipo: 'desvinculacion',
        entradas,
    };
};
