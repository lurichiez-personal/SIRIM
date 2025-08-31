import { Nomina, AsientoContable, Factura, Gasto, Ingreso, Item, MetodoPago, NotaCreditoDebito, Desvinculacion } from '../types';
import { useChartOfAccountsStore } from '../stores/useChartOfAccountsStore';

const getCuenta = (id: string) => {
    const cuenta = useChartOfAccountsStore.getState().getCuentaById(id);
    if (!cuenta) throw new Error(`La cuenta contable con ID ${id} no existe.`);
    return cuenta;
};

export const generarAsientoNomina = (nomina: Nomina, empresaId: number): AsientoContable => {
    const totalSalarioBruto = nomina.empleados.reduce((sum, e) => sum + e.salarioBruto, 0);
    const totalSfsEmpleado = nomina.empleados.reduce((sum, e) => sum + e.sfs, 0);
    const totalAfpEmpleado = nomina.empleados.reduce((sum, e) => sum + e.afp, 0);
    const totalIsr = nomina.empleados.reduce((sum, e) => sum + e.isr, 0);
    const totalAportesEmpleador = nomina.empleados.reduce((sum, e) => sum + e.totalAportesEmpleador, 0);
    const totalInfotep = nomina.empleados.reduce((s,e)=>s+e.infotep,0);

    return {
        id: `AS-NOM-${nomina.id}`,
        empresaId,
        fecha: nomina.fecha,
        descripcion: `Registro de nómina para el período ${nomina.periodo}`,
        transaccionId: nomina.id,
        transaccionTipo: 'nomina',
        entradas: [
            { cuentaId: '6101-01', descripcion: getCuenta('6101-01').nombre, debito: totalSalarioBruto, credito: 0 },
            { cuentaId: '6101-02', descripcion: getCuenta('6101-02').nombre, debito: totalAportesEmpleador, credito: 0 },
            { cuentaId: '2105-01', descripcion: getCuenta('2105-01').nombre, credito: totalSfsEmpleado + totalAfpEmpleado + (totalAportesEmpleador - totalInfotep), debito: 0 },
            { cuentaId: '2105-02', descripcion: getCuenta('2105-02').nombre, credito: totalIsr, debito: 0 },
            { cuentaId: '2105-03', descripcion: getCuenta('2105-03').nombre, credito: totalInfotep, debito: 0 },
            { cuentaId: '2102-01', descripcion: getCuenta('2102-01').nombre, credito: nomina.totalPagado, debito: 0 },
        ].filter(e => e.debito > 0 || e.credito > 0)
    };
};

export const generarAsientoFacturaVenta = (factura: Factura, items: Item[]): AsientoContable => {
    const subtotalSinDescuento = factura.items.reduce((acc, item) => acc + item.subtotal, 0);
    const costoVenta = factura.items.reduce((acc, item) => {
        const inventarioItem = items.find(i => i.id === item.itemId);
        return acc + ((inventarioItem?.costo || 0) * item.cantidad);
    }, 0);

    const entradas = [
        // Débito a Cuentas por Cobrar por el total
        { cuentaId: '1102-01', descripcion: getCuenta('1102-01').nombre, debito: factura.montoTotal, credito: 0 },
        // Crédito a Ingresos por el subtotal
        { cuentaId: '4101-02', descripcion: getCuenta('4101-02').nombre, credito: subtotalSinDescuento, debito: 0 },
        // Crédito a ITBIS por Pagar
        { cuentaId: '2106-01', descripcion: getCuenta('2106-01').nombre, credito: factura.itbis, debito: 0 },
    ];

    if (factura.montoDescuento && factura.montoDescuento > 0) {
        entradas.push({ cuentaId: '4102-01', descripcion: getCuenta('4102-01').nombre, debito: factura.montoDescuento, credito: 0 });
    }
    
    if (factura.isc && factura.isc > 0) {
        entradas.push({ cuentaId: '2106-02', descripcion: getCuenta('2106-02').nombre, credito: factura.isc, debito: 0 });
    }

    if (factura.propinaLegal && factura.propinaLegal > 0) {
        entradas.push({ cuentaId: '2106-03', descripcion: getCuenta('2106-03').nombre, credito: factura.propinaLegal, debito: 0 });
    }


    // Asiento de costo si aplica
    if (costoVenta > 0) {
        entradas.push({ cuentaId: '5101-01', descripcion: getCuenta('5101-01').nombre, debito: costoVenta, credito: 0 });
        entradas.push({ cuentaId: '1103-01', descripcion: getCuenta('1103-01').nombre, credito: costoVenta, debito: 0 });
    }
    
    return {
        id: `AS-FAC-${factura.id}`,
        empresaId: factura.empresaId,
        fecha: factura.fecha,
        descripcion: `Venta según factura NCF ${factura.ncf} a ${factura.clienteNombre}`,
        transaccionId: String(factura.id),
        transaccionTipo: 'factura',
        entradas: entradas.filter(e => e.debito > 0 || e.credito > 0),
    };
};

export const generarAsientoGasto = (gasto: Gasto): AsientoContable => {
    // Aquí se necesitaría una lógica más compleja para mapear `categoriaGasto` a una cuenta contable específica.
    // Por simplicidad, usaremos una cuenta de gasto genérica.
    const cuentaGastoId = '6102'; // Gastos por Trabajos, Suministros y Servicios

    return {
        id: `AS-GAS-${gasto.id}`,
        empresaId: gasto.empresaId,
        fecha: gasto.fecha,
        descripcion: `Compra según NCF ${gasto.ncf} a ${gasto.proveedorNombre}`,
        transaccionId: String(gasto.id),
        transaccionTipo: 'gasto',
        entradas: [
            // Débito a la cuenta de Gasto y al ITBIS adelantado
            { cuentaId: cuentaGastoId, descripcion: getCuenta(cuentaGastoId).nombre, debito: gasto.subtotal, credito: 0 },
            { cuentaId: '1104-01', descripcion: getCuenta('1104-01').nombre, debito: gasto.itbis, credito: 0 },
            // Crédito a Cuentas por Pagar o al Banco
            { cuentaId: '2101-01', descripcion: getCuenta('2101-01').nombre, credito: gasto.monto, debito: 0 },
        ].filter(e => e.debito > 0 || e.credito > 0),
    };
};

export const generarAsientoIngreso = (ingreso: Ingreso): AsientoContable => {
     // Determinar la cuenta de banco/caja basado en el método de pago
     const cuentaEfectivoId = '1101-02'; // Bancos (simplificado)

    return {
        id: `AS-ING-${ingreso.id}`,
        empresaId: ingreso.empresaId,
        fecha: ingreso.fecha,
        descripcion: `Cobro de factura #${ingreso.facturaId} a ${ingreso.clienteNombre}`,
        transaccionId: String(ingreso.id),
        transaccionTipo: 'ingreso',
        entradas: [
            // Débito al banco/caja
            { cuentaId: cuentaEfectivoId, descripcion: getCuenta(cuentaEfectivoId).nombre, debito: ingreso.monto, credito: 0 },
            // Crédito a Cuentas por Cobrar
            { cuentaId: '1102-01', descripcion: getCuenta('1102-01').nombre, credito: ingreso.monto, debito: 0 },
        ].filter(e => e.debito > 0 || e.credito > 0),
    };
};

export const generarAsientoNotaCredito = (nota: NotaCreditoDebito): AsientoContable => {
    const entradas = [
        // Crédito a Cuentas por Cobrar (disminuye)
        { cuentaId: '1102-01', descripcion: getCuenta('1102-01').nombre, credito: nota.montoTotal, debito: 0 },
        // Débito a Devoluciones y Descuentos (contra-ingreso, aumenta)
        { cuentaId: '4102-01', descripcion: getCuenta('4102-01').nombre, debito: nota.subtotal, credito: 0 },
        // Débito a ITBIS por Pagar (disminuye)
        { cuentaId: '2106-01', descripcion: getCuenta('2106-01').nombre, debito: nota.itbis, credito: 0 },
    ];

    if (nota.isc > 0) {
        entradas.push({ cuentaId: '2106-02', descripcion: getCuenta('2106-02').nombre, debito: nota.isc, credito: 0 });
    }
    if (nota.propinaLegal > 0) {
        entradas.push({ cuentaId: '2106-03', descripcion: getCuenta('2106-03').nombre, debito: nota.propinaLegal, credito: 0 });
    }

    return {
        id: `AS-NC-${nota.id}`,
        empresaId: nota.empresaId,
        fecha: nota.fecha,
        descripcion: `Nota de crédito NCF ${nota.ncf} a ${nota.clienteNombre}`,
        transaccionId: String(nota.id),
        transaccionTipo: 'nota_credito',
        entradas: entradas.filter(e => e.debito > 0 || e.credito > 0),
    };
};

export const generarAsientoDesvinculacion = (desvinculacion: Desvinculacion): AsientoContable => {
    const totalPrestaciones = desvinculacion.prestaciones.total;
    const cuentaBancoId = '1101-02'; // Banco (simplificado, podría venir del método de pago)
    const cuentaGastoId = '6101-03'; // Gastos por Prestaciones Laborales

    return {
        id: `AS-DESV-${desvinculacion.id}`,
        empresaId: desvinculacion.empresaId,
        fecha: desvinculacion.fechaSalida,
        descripcion: `Pago de prestaciones laborales a ${desvinculacion.empleadoNombre}`,
        transaccionId: String(desvinculacion.id),
        transaccionTipo: 'desvinculacion',
        entradas: [
            // Débito al gasto
            { cuentaId: cuentaGastoId, descripcion: getCuenta(cuentaGastoId).nombre, debito: totalPrestaciones, credito: 0 },
            // Crédito al banco
            { cuentaId: cuentaBancoId, descripcion: getCuenta(cuentaBancoId).nombre, credito: totalPrestaciones, debito: 0 },
        ].filter(e => e.debito > 0 || e.credito > 0),
    };
};
