import { create } from 'zustand';
import { CuentaContable } from '../types';

interface ChartOfAccountsState {
  cuentas: CuentaContable[];
  getCuentaById: (id: string) => CuentaContable | undefined;
}

// Catálogo de Cuentas estándar simplificado para República Dominicana
const catalogoCuentas: CuentaContable[] = [
    // Activos
    { id: '1', nombre: 'Activos', tipo: 'Activo', permiteMovimientos: false },
    { id: '11', nombre: 'Activos Corrientes', tipo: 'Activo', permiteMovimientos: false, padreId: '1' },
    { id: '1101', nombre: 'Efectivo y Equivalentes', tipo: 'Activo', permiteMovimientos: false, padreId: '11' },
    { id: '1101-01', nombre: 'Caja General', tipo: 'Activo', permiteMovimientos: true, padreId: '1101' },
    { id: '1101-02', nombre: 'Bancos', tipo: 'Activo', permiteMovimientos: true, padreId: '1101' },
    { id: '1102', nombre: 'Cuentas por Cobrar', tipo: 'Activo', permiteMovimientos: false, padreId: '11' },
    { id: '1102-01', nombre: 'Cuentas por Cobrar Clientes', tipo: 'Activo', permiteMovimientos: true, padreId: '1102' },
    { id: '1103', nombre: 'Inventario', tipo: 'Activo', permiteMovimientos: false, padreId: '11' },
    { id: '1103-01', nombre: 'Inventario de Mercancías', tipo: 'Activo', permiteMovimientos: true, padreId: '1103' },
    { id: '1104', nombre: 'Impuestos Adelantados', tipo: 'Activo', permiteMovimientos: false, padreId: '11' },
    { id: '1104-01', nombre: 'ITBIS Adelantado', tipo: 'Activo', permiteMovimientos: true, padreId: '1104' },

    // Pasivos
    { id: '2', nombre: 'Pasivos', tipo: 'Pasivo', permiteMovimientos: false },
    { id: '21', nombre: 'Pasivos Corrientes', tipo: 'Pasivo', permiteMovimientos: false, padreId: '2' },
    { id: '2101', nombre: 'Cuentas por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21' },
    { id: '2101-01', nombre: 'Cuentas por Pagar Proveedores', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2101' },
    { id: '2105', nombre: 'Retenciones por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21' },
    { id: '2105-01', nombre: 'Retenciones TSS por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105' },
    { id: '2105-02', nombre: 'Retenciones de ISR por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105' },
    { id: '2105-03', nombre: 'Retenciones de INFOTEP por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105' },
    { id: '2106', nombre: 'Impuestos por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21' },
    { id: '2106-01', nombre: 'ITBIS por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106' },
    { id: '2106-02', nombre: 'ISC por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106' },
    { id: '2106-03', nombre: 'Propina Legal por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106' },
    { id: '2102-01', nombre: 'Nómina por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '21' },

    // Capital
    { id: '3', nombre: 'Capital', tipo: 'Capital', permiteMovimientos: false },
    { id: '31', nombre: 'Capital Social', tipo: 'Capital', permiteMovimientos: true, padreId: '3' },
    { id: '32', nombre: 'Resultados Acumulados', tipo: 'Capital', permiteMovimientos: true, padreId: '3' },
    { id: '33', nombre: 'Resultado del Período', tipo: 'Capital', permiteMovimientos: true, padreId: '3' },

    // Ingresos
    { id: '4', nombre: 'Ingresos', tipo: 'Ingreso', permiteMovimientos: false },
    { id: '41', nombre: 'Ingresos Operacionales', tipo: 'Ingreso', permiteMovimientos: false, padreId: '4' },
    { id: '4101-01', nombre: 'Venta de Bienes', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41' },
    { id: '4101-02', nombre: 'Venta de Servicios', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41' },
    { id: '4102-01', nombre: 'Devoluciones y Descuentos en Ventas', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41' }, // Contra-cuenta

    // Costos
    { id: '5', nombre: 'Costos', tipo: 'Costo', permiteMovimientos: false },
    { id: '51', nombre: 'Costo de Venta', tipo: 'Costo', permiteMovimientos: false, padreId: '5' },
    { id: '5101-01', nombre: 'Costo de Mercancía Vendida', tipo: 'Costo', permiteMovimientos: true, padreId: '51' },
    
    // Gastos
    { id: '6', nombre: 'Gastos', tipo: 'Gasto', permiteMovimientos: false },
    { id: '61', nombre: 'Gastos Operacionales', tipo: 'Gasto', permiteMovimientos: false, padreId: '6' },
    { id: '6101', nombre: 'Gastos de Personal', tipo: 'Gasto', permiteMovimientos: false, padreId: '61' },
    { id: '6101-01', nombre: 'Sueldos y Salarios', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101' },
    { id: '6101-02', nombre: 'Aportes a la Seguridad Social', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101' },
    { id: '6101-03', nombre: 'Gastos por Prestaciones Laborales', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101' },
    { id: '6102', nombre: 'Gastos por Trabajos, Suministros y Servicios', tipo: 'Gasto', permiteMovimientos: true, padreId: '61' },
    { id: '6103', nombre: 'Arrendamientos', tipo: 'Gasto', permiteMovimientos: true, padreId: '61' },
    { id: '6104', nombre: 'Gastos de Activos Fijos', tipo: 'Gasto', permiteMovimientos: true, padreId: '61' },
];

export const useChartOfAccountsStore = create<ChartOfAccountsState>((set, get) => ({
    cuentas: catalogoCuentas,
    getCuentaById: (id) => get().cuentas.find(c => c.id === id),
}));