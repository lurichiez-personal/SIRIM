// Utilidades para cálculos de analítica empresarial avanzada

import { Factura, Gasto, Ingreso, FacturaEstado } from '../types';

export interface AdvancedKPIs {
  // Métricas financieras básicas
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  grossMargin: number;
  
  // Métricas de rendimiento
  averageInvoiceValue: number;
  customerAcquisitionRate: number;
  collectionEfficiency: number;
  expenseRatio: number;
  
  // Métricas de flujo de efectivo
  operatingCashFlow: number;
  cashConversionCycle: number;
  currentRatio: number;
  
  // Métricas fiscales
  taxLiability: {
    itbis: number;
    isr: number;
    total: number;
  };
  
  // Alertas de negocio
  alerts: BusinessAlert[];
}

export interface BusinessAlert {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  value?: string;
  actionRequired?: string;
}

export interface TimeSeriesData {
  period: string;
  ingresos: number;
  gastos: number;
  flujo: number;
  clientes: number;
}

export interface RevenueSource {
  source: string;
  amount: number;
  percentage: number;
}

// Calcular KPIs avanzados
export const calculateAdvancedKPIs = (
  facturas: Factura[],
  gastos: Gasto[],
  ingresos: Ingreso[],
  startDate?: Date,
  endDate?: Date
): AdvancedKPIs => {
  const now = new Date();
  const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
  const end = endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  // Filtrar por período
  const periodFacturas = facturas.filter(f => {
    const facturaDate = new Date(f.fecha);
    return facturaDate >= start && facturaDate <= end && f.estado !== FacturaEstado.Anulada;
  });
  
  const periodGastos = gastos.filter(g => {
    const gastoDate = new Date(g.fecha);
    return gastoDate >= start && gastoDate <= end;
  });
  
  const periodIngresos = ingresos.filter(i => {
    const ingresoDate = new Date(i.fecha);
    return ingresoDate >= start && ingresoDate <= end;
  });
  
  // Métricas básicas
  const totalRevenue = periodFacturas.reduce((sum, f) => sum + f.montoTotal, 0);
  const totalExpenses = periodGastos.reduce((sum, g) => sum + g.monto, 0);
  const totalCollected = periodIngresos.reduce((sum, i) => sum + i.monto, 0);
  const netProfit = totalCollected - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (totalRevenue - totalExpenses) / totalRevenue : 0;
  
  // Métricas de rendimiento
  const averageInvoiceValue = periodFacturas.length > 0 ? totalRevenue / periodFacturas.length : 0;
  const uniqueCustomers = new Set(periodFacturas.map(f => f.clienteId)).size;
  const previousPeriodCustomers = getPreviousPeriodCustomers(facturas, start);
  const customerAcquisitionRate = previousPeriodCustomers > 0 ? 
    (uniqueCustomers - previousPeriodCustomers) / previousPeriodCustomers : 0;
  
  const collectionEfficiency = totalRevenue > 0 ? totalCollected / totalRevenue : 0;
  const expenseRatio = totalCollected > 0 ? totalExpenses / totalCollected : 0;
  
  // Métricas de flujo de efectivo
  const operatingCashFlow = totalCollected - totalExpenses;
  const accountsReceivable = facturas
    .filter(f => f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente)
    .reduce((sum, f) => sum + (f.montoTotal - f.montoPagado), 0);
  const cashConversionCycle = calculateCashConversionCycle(facturas, ingresos);
  const currentRatio = calculateCurrentRatio(accountsReceivable, totalExpenses);
  
  // Métricas fiscales
  const itbisVentas = periodFacturas.reduce((sum, f) => sum + (f.itbis || 0), 0);
  const itbisCompras = periodGastos.reduce((sum, g) => sum + (g.itbis || 0), 0);
  const itbisAPagar = itbisVentas - itbisCompras;
  
  const isrBase = Math.max(0, netProfit);
  const isrRate = 0.27; // 27% para empresas en RD
  const isrAPagar = isrBase * isrRate;
  
  const taxLiability = {
    itbis: Math.max(0, itbisAPagar),
    isr: isrAPagar,
    total: Math.max(0, itbisAPagar) + isrAPagar
  };
  
  // Generar alertas de negocio
  const alerts = generateBusinessAlerts({
    totalRevenue,
    totalExpenses,
    netProfit,
    collectionEfficiency,
    expenseRatio,
    accountsReceivable,
    taxLiability,
    facturas: periodFacturas
  });
  
  return {
    totalRevenue,
    totalExpenses,
    netProfit,
    grossMargin,
    averageInvoiceValue,
    customerAcquisitionRate,
    collectionEfficiency,
    expenseRatio,
    operatingCashFlow,
    cashConversionCycle,
    currentRatio,
    taxLiability,
    alerts
  };
};

// Obtener datos de series temporales para gráficos
export const getTimeSeriesData = (
  facturas: Factura[],
  gastos: Gasto[],
  ingresos: Ingreso[],
  periods: number = 6
): TimeSeriesData[] => {
  const data: TimeSeriesData[] = [];
  const now = new Date();
  
  for (let i = periods - 1; i >= 0; i--) {
    const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    
    const periodFacturas = facturas.filter(f => {
      const date = new Date(f.fecha);
      return date >= periodStart && date <= periodEnd && f.estado !== FacturaEstado.Anulada;
    });
    
    const periodGastos = gastos.filter(g => {
      const date = new Date(g.fecha);
      return date >= periodStart && date <= periodEnd;
    });
    
    const periodIngresos = ingresos.filter(ing => {
      const date = new Date(ing.fecha);
      return date >= periodStart && date <= periodEnd;
    });
    
    const ingresos_total = periodIngresos.reduce((sum, i) => sum + i.monto, 0);
    const gastos_total = periodGastos.reduce((sum, g) => sum + g.monto, 0);
    const flujo = ingresos_total - gastos_total;
    const clientes = new Set(periodFacturas.map(f => f.clienteId)).size;
    
    data.push({
      period: periodStart.toLocaleDateString('es-DO', { month: 'short', year: '2-digit' }),
      ingresos: ingresos_total,
      gastos: gastos_total,
      flujo,
      clientes
    });
  }
  
  return data;
};

// Calcular fuentes de ingresos
export const getRevenueBreakdown = (facturas: Factura[]): RevenueSource[] => {
  const revenueByClient = new Map<string, number>();
  
  facturas.forEach(f => {
    if (f.estado !== FacturaEstado.Anulada) {
      const current = revenueByClient.get(f.clienteNombre) || 0;
      revenueByClient.set(f.clienteNombre, current + f.montoTotal);
    }
  });
  
  const total = Array.from(revenueByClient.values()).reduce((sum, val) => sum + val, 0);
  
  const sources: RevenueSource[] = Array.from(revenueByClient.entries())
    .map(([source, amount]) => ({
      source,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5); // Top 5 clientes
  
  return sources;
};

// Funciones auxiliares
const getPreviousPeriodCustomers = (facturas: Factura[], currentStart: Date): number => {
  const previousStart = new Date(currentStart);
  previousStart.setMonth(previousStart.getMonth() - 1);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(0); // Último día del mes anterior
  
  const previousPeriodFacturas = facturas.filter(f => {
    const date = new Date(f.fecha);
    return date >= previousStart && date <= previousEnd && f.estado !== FacturaEstado.Anulada;
  });
  
  return new Set(previousPeriodFacturas.map(f => f.clienteId)).size;
};

const calculateCashConversionCycle = (facturas: Factura[], ingresos: Ingreso[]): number => {
  // Simplified calculation: average days to collect payment
  const paidInvoices = facturas.filter(f => f.estado === FacturaEstado.Pagada);
  
  if (paidInvoices.length === 0) return 30; // Default assumption
  
  let totalDays = 0;
  let validCalculations = 0;
  
  paidInvoices.forEach(f => {
    const relatedPayments = ingresos.filter(i => i.facturaId === f.id);
    if (relatedPayments.length > 0) {
      const lastPayment = relatedPayments.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      )[0];
      
      const invoiceDate = new Date(f.fecha);
      const paymentDate = new Date(lastPayment.fecha);
      const daysDiff = Math.ceil((paymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 0 && daysDiff <= 365) { // Reasonable range
        totalDays += daysDiff;
        validCalculations++;
      }
    }
  });
  
  return validCalculations > 0 ? Math.round(totalDays / validCalculations) : 30;
};

const calculateCurrentRatio = (currentAssets: number, currentLiabilities: number): number => {
  return currentLiabilities > 0 ? currentAssets / currentLiabilities : 1;
};

const generateBusinessAlerts = (data: {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  collectionEfficiency: number;
  expenseRatio: number;
  accountsReceivable: number;
  taxLiability: { total: number };
  facturas: Factura[];
}): BusinessAlert[] => {
  const alerts: BusinessAlert[] = [];
  
  // Alert por margen bajo
  if (data.netProfit < 0) {
    alerts.push({
      title: 'Pérdidas Operacionales',
      message: 'Los gastos superan los ingresos este período',
      severity: 'high',
      value: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Math.abs(data.netProfit)),
      actionRequired: 'Revisar gastos y estrategia de precios'
    });
  }
  
  // Alert por baja eficiencia de cobro
  if (data.collectionEfficiency < 0.7) {
    alerts.push({
      title: 'Baja Eficiencia de Cobro',
      message: 'Solo se ha cobrado el ' + (data.collectionEfficiency * 100).toFixed(1) + '% de las ventas',
      severity: 'medium',
      actionRequired: 'Mejorar procesos de cobranza'
    });
  }
  
  // Alert por alto ratio de gastos
  if (data.expenseRatio > 0.8) {
    alerts.push({
      title: 'Gastos Elevados',
      message: 'Los gastos representan ' + (data.expenseRatio * 100).toFixed(1) + '% de los ingresos',
      severity: 'medium',
      actionRequired: 'Optimizar estructura de costos'
    });
  }
  
  // Alert por obligaciones fiscales altas
  if (data.taxLiability.total > data.netProfit * 0.5) {
    alerts.push({
      title: 'Alta Carga Fiscal',
      message: 'Las obligaciones fiscales son significativas',
      severity: 'low',
      value: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(data.taxLiability.total),
      actionRequired: 'Planificar flujo de caja para impuestos'
    });
  }
  
  // Alert por facturas vencidas
  const overdueInvoices = data.facturas.filter(f => {
    if (f.estado === FacturaEstado.Vencida) return true;
    const invoiceDate = new Date(f.fecha);
    const now = new Date();
    const daysDiff = Math.ceil((now.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 30 && (f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente);
  });
  
  if (overdueInvoices.length > 0) {
    const overdueAmount = overdueInvoices.reduce((sum, f) => sum + (f.montoTotal - f.montoPagado), 0);
    alerts.push({
      title: 'Facturas Vencidas',
      message: `${overdueInvoices.length} facturas con más de 30 días vencidas`,
      severity: 'high',
      value: new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(overdueAmount),
      actionRequired: 'Gestionar cobranza inmediatamente'
    });
  }
  
  return alerts;
};