
import { create } from 'zustand';
import { CuentaContable } from '../types';

interface ChartOfAccountsState {
  cuentas: CuentaContable[];
  getCuentaById: (id: string) => CuentaContable | undefined;
}

// Catálogo de Cuentas estándar simplificado para República Dominicana
// Actualizado con mapeo DGII y niveles jerárquicos para automatización IR-2
const catalogoCuentas: CuentaContable[] = [
    // 1. ACTIVOS
    { id: '1', nombre: 'Activos', tipo: 'Activo', permiteMovimientos: false, nivel: 1 },
    
    // 11. Activos Corrientes
    { id: '11', nombre: 'Activos Corrientes', tipo: 'Activo', permiteMovimientos: false, padreId: '1', nivel: 2 },
    
    // 1101 Efectivo
    { id: '1101', nombre: 'Efectivo y Equivalentes', tipo: 'Activo', permiteMovimientos: false, padreId: '11', nivel: 3 },
    { id: '1101-01', nombre: 'Caja General', tipo: 'Activo', permiteMovimientos: true, padreId: '1101', categoriaDGII: 'A1_1_1', nivel: 4 },
    { id: '1101-02', nombre: 'Bancos', tipo: 'Activo', permiteMovimientos: true, padreId: '1101', categoriaDGII: 'A1_1_1', nivel: 4 },

    // 1102 Cuentas por Cobrar
    { id: '1102', nombre: 'Cuentas por Cobrar', tipo: 'Activo', permiteMovimientos: false, padreId: '11', nivel: 3 },
    { id: '1102-01', nombre: 'Cuentas por Cobrar Clientes', tipo: 'Activo', permiteMovimientos: true, padreId: '1102', categoriaDGII: 'A1_1_2', nivel: 4 },
    { id: '1102-02', nombre: 'Cuentas por Cobrar Relacionados Locales', tipo: 'Activo', permiteMovimientos: true, padreId: '1102', categoriaDGII: 'A1_1_3', nivel: 4 },
    { id: '1102-03', nombre: 'Cuentas por Cobrar Relacionados Exterior', tipo: 'Activo', permiteMovimientos: true, padreId: '1102', categoriaDGII: 'A1_1_3', nivel: 4 },
    { id: '1102-04', nombre: 'Documentos por Cobrar', tipo: 'Activo', permiteMovimientos: true, padreId: '1102', categoriaDGII: 'A1_1_4', nivel: 4 },
    { id: '1102-05', nombre: 'Provisión Cuentas Incobrables', tipo: 'Activo', permiteMovimientos: true, padreId: '1102', categoriaDGII: 'A1_5_5', nivel: 4 }, // Nota: A1_5_5 es resta

    // 1103 Inventario
    { id: '1103', nombre: 'Inventario', tipo: 'Activo', permiteMovimientos: false, padreId: '11', nivel: 3 },
    { id: '1103-01', nombre: 'Inventario de Mercancías', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_1_5', nivel: 4 },
    { id: '1103-02', nombre: 'Inventario Materia Prima', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_1_6', nivel: 4 },
    { id: '1103-03', nombre: 'Inventario Productos en Proceso', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_1_7', nivel: 4 },
    { id: '1103-04', nombre: 'Otros Inventarios', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_1_8', nivel: 4 },
    { id: '1103-05', nombre: 'Mercancías en Tránsito', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_1_9', nivel: 4 },
    { id: '1103-06', nombre: 'Provisión de Inventario', tipo: 'Activo', permiteMovimientos: true, padreId: '1103', categoriaDGII: 'A1_5_6', nivel: 4 }, // Nota: Resta

    // 1104 Impuestos Adelantados
    { id: '1104', nombre: 'Impuestos Adelantados', tipo: 'Activo', permiteMovimientos: false, padreId: '11', nivel: 3 },
    { id: '1104-01', nombre: 'ITBIS Adelantado', tipo: 'Activo', permiteMovimientos: true, padreId: '1104', categoriaDGII: 'A1_1_11', nivel: 4 }, // Otros Activos Corrientes
    { id: '1104-02', nombre: 'Anticipos ISR', tipo: 'Activo', permiteMovimientos: true, padreId: '1104', categoriaDGII: 'A1_4_2', nivel: 4 },
    { id: '1104-03', nombre: 'ISR Diferido Activo', tipo: 'Activo', permiteMovimientos: true, padreId: '1104', categoriaDGII: 'A1_4_2', nivel: 4 },
    
    // 1105 Gastos Pagados por Adelantado
    { id: '1105', nombre: 'Gastos Pagados por Adelantado', tipo: 'Activo', permiteMovimientos: false, padreId: '11', nivel: 3 },
    { id: '1105-01', nombre: 'Seguros Pagados por Adelantado', tipo: 'Activo', permiteMovimientos: true, padreId: '1105', categoriaDGII: 'A1_1_10', nivel: 4 },

    // 12. Activos Fijos
    { id: '12', nombre: 'Activos Fijos', tipo: 'Activo', permiteMovimientos: false, padreId: '1', nivel: 2 },
    
    { id: '1201', nombre: 'Edificaciones Categoría 1', tipo: 'Activo', permiteMovimientos: true, padreId: '12', categoriaDGII: 'A1_2_1', nivel: 3 },
    { id: '1201-01', nombre: 'Depreciación Acum. Cat. 1', tipo: 'Activo', permiteMovimientos: true, padreId: '1201', categoriaDGII: 'A1_5_1', nivel: 4 }, // Resta

    { id: '1202', nombre: 'Equipos Categoría 2', tipo: 'Activo', permiteMovimientos: true, padreId: '12', categoriaDGII: 'A1_2_3', nivel: 3 },
    { id: '1202-01', nombre: 'Depreciación Acum. Cat. 2', tipo: 'Activo', permiteMovimientos: true, padreId: '1202', categoriaDGII: 'A1_5_3', nivel: 4 }, // Resta

    { id: '1203', nombre: 'Otros Activos Depreciables Cat. 3', tipo: 'Activo', permiteMovimientos: true, padreId: '12', categoriaDGII: 'A1_2_4', nivel: 3 },
    { id: '1203-01', nombre: 'Depreciación Acum. Cat. 3', tipo: 'Activo', permiteMovimientos: true, padreId: '1203', categoriaDGII: 'A1_5_4', nivel: 4 }, // Resta

    { id: '1204', nombre: 'Activos No Depreciables (Terrenos)', tipo: 'Activo', permiteMovimientos: true, padreId: '12', categoriaDGII: 'A1_2_5', nivel: 3 },
    { id: '1205', nombre: 'Revaluación de Activos', tipo: 'Activo', permiteMovimientos: true, padreId: '12', categoriaDGII: 'A1_2_7', nivel: 3 },

    // 13. Inversiones
    { id: '13', nombre: 'Inversiones', tipo: 'Activo', permiteMovimientos: false, padreId: '1', nivel: 2 },
    { id: '1301', nombre: 'Inversiones Permanentes', tipo: 'Activo', permiteMovimientos: false, padreId: '13', nivel: 3 },
    { id: '1301-01', nombre: 'Inversiones en Acciones', tipo: 'Activo', permiteMovimientos: true, padreId: '1301', categoriaDGII: 'A1_3_2', nivel: 4 },


    // 2. PASIVOS
    { id: '2', nombre: 'Pasivos', tipo: 'Pasivo', permiteMovimientos: false, nivel: 1 },
    
    // 21. Pasivos Corrientes
    { id: '21', nombre: 'Pasivos Corrientes', tipo: 'Pasivo', permiteMovimientos: false, padreId: '2', nivel: 2 },
    
    { id: '2101', nombre: 'Cuentas por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21', nivel: 3 },
    { id: '2101-01', nombre: 'Cuentas por Pagar Proveedores', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2101', categoriaDGII: 'A1_7_2', nivel: 4 },
    { id: '2101-02', nombre: 'Proveedores Exterior', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2101', categoriaDGII: 'A1_7_2', nivel: 4 },
    { id: '2101-03', nombre: 'Proveedores Relacionados', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2101', categoriaDGII: 'A1_7_2', nivel: 4 },

    { id: '2105', nombre: 'Retenciones por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21', nivel: 3 },
    { id: '2105-01', nombre: 'Retenciones TSS por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105', categoriaDGII: 'A1_7_4', nivel: 4 },
    { id: '2105-02', nombre: 'Retenciones de ISR por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105', categoriaDGII: 'A1_7_3', nivel: 4 },
    { id: '2105-03', nombre: 'Retenciones de INFOTEP por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2105', categoriaDGII: 'A1_7_4', nivel: 4 },

    { id: '2106', nombre: 'Impuestos por Pagar', tipo: 'Pasivo', permiteMovimientos: false, padreId: '21', nivel: 3 },
    { id: '2106-01', nombre: 'ITBIS por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106', categoriaDGII: 'A1_7_3', nivel: 4 },
    { id: '2106-02', nombre: 'ISC por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106', categoriaDGII: 'A1_7_3', nivel: 4 },
    { id: '2106-03', nombre: 'Propina Legal por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106', categoriaDGII: 'A1_7_4', nivel: 4 },
    { id: '2106-04', nombre: 'ISR por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106', categoriaDGII: 'A1_7_3', nivel: 4 },
    { id: '2106-05', nombre: 'Anticipos Recibidos Clientes', tipo: 'Pasivo', permiteMovimientos: true, padreId: '2106', categoriaDGII: 'A1_7_5', nivel: 4 },

    { id: '2102-01', nombre: 'Nómina por Pagar', tipo: 'Pasivo', permiteMovimientos: true, padreId: '21', categoriaDGII: 'A1_7_4', nivel: 4 },

    // 22. Pasivos Largo Plazo
    { id: '22', nombre: 'Pasivos Largo Plazo', tipo: 'Pasivo', permiteMovimientos: false, padreId: '2', nivel: 2 },
    { id: '2201', nombre: 'Préstamos Bancarios Locales LP', tipo: 'Pasivo', permiteMovimientos: true, padreId: '22', categoriaDGII: 'A1_8_2', nivel: 3 },
    { id: '2202', nombre: 'Préstamos Exterior LP', tipo: 'Pasivo', permiteMovimientos: true, padreId: '22', categoriaDGII: 'A1_8_3', nivel: 3 },
    { id: '2203', nombre: 'Préstamos Relacionados Locales LP', tipo: 'Pasivo', permiteMovimientos: true, padreId: '22', categoriaDGII: 'A1_8_4', nivel: 3, esPrestamoRelacionado: true },
    { id: '2204', nombre: 'Préstamos Relacionados Exterior LP', tipo: 'Pasivo', permiteMovimientos: true, padreId: '22', categoriaDGII: 'A1_8_5', nivel: 3, esPrestamoRelacionado: true },
    { id: '2205', nombre: 'Préstamos Accionistas LP', tipo: 'Pasivo', permiteMovimientos: true, padreId: '22', categoriaDGII: 'A1_8_8', nivel: 3, esPrestamoRelacionado: true },


    // 3. CAPITAL
    { id: '3', nombre: 'Capital', tipo: 'Capital', permiteMovimientos: false, nivel: 1 },
    { id: '31', nombre: 'Capital Social', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_1', nivel: 2 },
    { id: '32', nombre: 'Resultados Acumulados', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_4', nivel: 2 },
    { id: '33', nombre: 'Resultado del Período', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_5', nivel: 2 },
    { id: '34', nombre: 'Reserva Legal', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_2', nivel: 2 },
    { id: '35', nombre: 'Otras Reservas', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_6', nivel: 2 },
    { id: '36', nombre: 'Superávit Revaluación', tipo: 'Capital', permiteMovimientos: true, padreId: '3', categoriaDGII: 'A1_10_3', nivel: 2 },


    // 4. INGRESOS
    { id: '4', nombre: 'Ingresos', tipo: 'Ingreso', permiteMovimientos: false, nivel: 1 },
    
    // 41. Ingresos Operacionales
    { id: '41', nombre: 'Ingresos Operacionales', tipo: 'Ingreso', permiteMovimientos: false, padreId: '4', nivel: 2 },
    { id: '4101-01', nombre: 'Venta de Bienes', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_1', nivel: 3 },
    { id: '4101-02', nombre: 'Venta de Servicios', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_1', nivel: 3 },
    { id: '4101-03', nombre: 'Ventas Exportaciones', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_2', nivel: 3 },
    { id: '4101-04', nombre: 'Ventas a Relacionados', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_1', nivel: 3 },
    { id: '4102-01', nombre: 'Devoluciones en Ventas', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_3', nivel: 3 }, // Nota: B1_1_3 es resta
    { id: '4102-02', nombre: 'Descuentos en Ventas', tipo: 'Ingreso', permiteMovimientos: true, padreId: '41', categoriaDGII: 'B1_1_4', nivel: 3 }, // Nota: B1_1_4 es resta

    // 42. Ingresos Financieros
    { id: '42', nombre: 'Ingresos Financieros', tipo: 'Ingreso', permiteMovimientos: false, padreId: '4', nivel: 2 },
    { id: '4201', nombre: 'Intereses Bancarios', tipo: 'Ingreso', permiteMovimientos: true, padreId: '42', categoriaDGII: 'B1_2_1', nivel: 3 },
    { id: '4202', nombre: 'Intereses Relacionados', tipo: 'Ingreso', permiteMovimientos: true, padreId: '42', categoriaDGII: 'B1_2_4', nivel: 3 },
    { id: '4203', nombre: 'Dividendos', tipo: 'Ingreso', permiteMovimientos: true, padreId: '42', categoriaDGII: 'B1_2_3', nivel: 3 },

    // 43. Otros Ingresos
    { id: '43', nombre: 'Otros Ingresos', tipo: 'Ingreso', permiteMovimientos: false, padreId: '4', nivel: 2 },
    { id: '4301', nombre: 'Ingresos Extraordinarios', tipo: 'Ingreso', permiteMovimientos: true, padreId: '43', categoriaDGII: 'B1_3_5', nivel: 3 },
    { id: '4302', nombre: 'Ganancia Venta Activos', tipo: 'Ingreso', permiteMovimientos: true, padreId: '43', categoriaDGII: 'B1_3_1', nivel: 3 },


    // 5. COSTOS
    { id: '5', nombre: 'Costos', tipo: 'Costo', permiteMovimientos: false, nivel: 1 },
    { id: '51', nombre: 'Costo de Venta', tipo: 'Costo', permiteMovimientos: false, padreId: '5', nivel: 2 },
    { id: '5101-01', nombre: 'Costo de Mercancía Vendida', tipo: 'Costo', permiteMovimientos: true, padreId: '51', categoriaDGII: 'B1_5_1', nivel: 3 },
    
    // 6. GASTOS
    { id: '6', nombre: 'Gastos', tipo: 'Gasto', permiteMovimientos: false, nivel: 1 },
    
    // 61. Gastos Operacionales
    { id: '61', nombre: 'Gastos Operacionales', tipo: 'Gasto', permiteMovimientos: false, padreId: '6', nivel: 2 },
    
    // 6101 Personal
    { id: '6101', nombre: 'Gastos de Personal', tipo: 'Gasto', permiteMovimientos: false, padreId: '61', nivel: 3 },
    { id: '6101-01', nombre: 'Sueldos y Salarios', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101', categoriaDGII: 'B1_6_1', nivel: 4 },
    { id: '6101-02', nombre: 'Aportes a la Seguridad Social', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101', categoriaDGII: 'B1_6_4', nivel: 4 },
    { id: '6101-03', nombre: 'Gastos por Prestaciones Laborales', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101', categoriaDGII: 'B1_6_6', nivel: 4 },
    { id: '6101-04', nombre: 'INFOTEP', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101', categoriaDGII: 'B1_6_5', nivel: 4 },
    { id: '6101-05', nombre: 'ITBIS Proporcional Personal', tipo: 'Gasto', permiteMovimientos: true, padreId: '6101', categoriaDGII: 'B1_6_7', nivel: 4, tratamientoFiscal: 'NO_DEDUCIBLE', tipoAjusteAnexoG: 'IMPUESTO_NO_DEDUCIBLE' },

    // 6102 Servicios
    { id: '6102', nombre: 'Gastos por Trabajos, Suministros y Servicios', tipo: 'Gasto', permiteMovimientos: true, padreId: '61', categoriaDGII: 'B1_7_7', nivel: 3 }, // Por defecto a "Otros"
    { id: '6102-01', nombre: 'Honorarios Personas Físicas', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_1', nivel: 4 },
    { id: '6102-02', nombre: 'Honorarios Personas Morales', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_2', nivel: 4 },
    { id: '6102-03', nombre: 'Servicios Exterior', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_3', nivel: 4 },
    { id: '6102-04', nombre: 'ITBIS Proporcional Servicios', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_8', nivel: 4, tratamientoFiscal: 'NO_DEDUCIBLE', tipoAjusteAnexoG: 'IMPUESTO_NO_DEDUCIBLE' },
    { id: '6102-05', nombre: 'Comunicaciones', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_7', nivel: 4 },
    { id: '6102-06', nombre: 'Energía Eléctrica', tipo: 'Gasto', permiteMovimientos: true, padreId: '6102', categoriaDGII: 'B1_7_7', nivel: 4 },

    // Gastos No Deducibles (Ejemplos)
    { id: '6105', nombre: 'Gastos No Admitidos', tipo: 'Gasto', permiteMovimientos: false, padreId: '61', nivel: 3 },
    { id: '6105-01', nombre: 'Multas y Recargos', tipo: 'Gasto', permiteMovimientos: true, padreId: '6105', categoriaDGII: 'B1_13_6', nivel: 4, tratamientoFiscal: 'NO_DEDUCIBLE', tipoAjusteAnexoG: 'MULTA' },
    { id: '6105-02', nombre: 'Gastos sin Comprobante', tipo: 'Gasto', permiteMovimientos: true, padreId: '6105', categoriaDGII: 'B1_13_6', nivel: 4, tratamientoFiscal: 'NO_DEDUCIBLE', tipoAjusteAnexoG: 'SIN_COMPROBANTE' },


    { id: '6103', nombre: 'Arrendamientos', tipo: 'Gasto', permiteMovimientos: true, padreId: '61', categoriaDGII: 'B1_8_3', nivel: 3 },
    { id: '6104', nombre: 'Gastos de Activos Fijos (Depreciación)', tipo: 'Gasto', permiteMovimientos: true, padreId: '61', categoriaDGII: 'B1_9_1', nivel: 3 },

    // 62 Gastos Financieros
    { id: '62', nombre: 'Gastos Financieros', tipo: 'Gasto', permiteMovimientos: false, padreId: '6', nivel: 2 },
    { id: '6201', nombre: 'Intereses Bancos Locales', tipo: 'Gasto', permiteMovimientos: true, padreId: '62', categoriaDGII: 'B1_12_1', nivel: 3 },
    { id: '6202', nombre: 'Intereses Exterior', tipo: 'Gasto', permiteMovimientos: true, padreId: '62', categoriaDGII: 'B1_12_2', nivel: 3 },
    { id: '6203', nombre: 'Intereses Relacionados', tipo: 'Gasto', permiteMovimientos: true, padreId: '62', categoriaDGII: 'B1_12_3', nivel: 3, tratamientoFiscal: 'SUJETO_LIMITE' }, // Subcapitalización
    { id: '6204', nombre: 'Impuesto 0.0015', tipo: 'Gasto', permiteMovimientos: true, padreId: '62', categoriaDGII: 'B1_12_8', nivel: 3, tratamientoFiscal: 'NO_DEDUCIBLE', tipoAjusteAnexoG: 'IMPUESTO_NO_DEDUCIBLE' },
];

export const useChartOfAccountsStore = create<ChartOfAccountsState>((set, get) => ({
    cuentas: catalogoCuentas,
    getCuentaById: (id) => get().cuentas.find(c => c.id === id),
}));
