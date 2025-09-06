

import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  KPIWidget, 
  AlertWidget, 
  CashFlowChart, 
  RevenueBreakdown, 
  PerformanceMetrics, 
  SalesTargetWidget 
} from '../../components/analytics/AnalyticsWidgets';
import { 
  calculateAdvancedKPIs, 
  getTimeSeriesData, 
  getRevenueBreakdown 
} from '../../utils/analyticsCalculations';
import { InformationCircleIcon, IngresosIcon, ReportesIcon, ClientesIcon } from '../../components/icons/Icons';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const { getKpis } = useDataStore();
  const { settings } = useSettingsStore();

  const tenantSettings = useMemo(() => {
    if (selectedTenant) return settings[selectedTenant.id];
    return { accentColor: '#005A9C' };
  }, [selectedTenant, settings]);

  const { facturas, gastos, ingresos } = useDataStore();
  const kpis = useMemo(() => getKpis(), [getKpis]);

  // Datos analíticos avanzados
  const advancedKPIs = useMemo(() => {
    if (!selectedTenant) return null;
    return calculateAdvancedKPIs(
      facturas.filter(f => f.empresaId === selectedTenant.id),
      gastos.filter(g => g.empresaId === selectedTenant.id),
      ingresos.filter(i => i.empresaId === selectedTenant.id)
    );
  }, [facturas, gastos, ingresos, selectedTenant]);

  const timeSeriesData = useMemo(() => {
    if (!selectedTenant) return [];
    return getTimeSeriesData(
      facturas.filter(f => f.empresaId === selectedTenant.id),
      gastos.filter(g => g.empresaId === selectedTenant.id),
      ingresos.filter(i => i.empresaId === selectedTenant.id)
    );
  }, [facturas, gastos, ingresos, selectedTenant]);

  const revenueBreakdown = useMemo(() => {
    if (!selectedTenant) return [];
    return getRevenueBreakdown(
      facturas.filter(f => f.empresaId === selectedTenant.id)
    );
  }, [facturas, selectedTenant]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
  };

  // Datos históricos para comparaciones de tendencias
  const previousMonthKPIs = useMemo(() => {
    if (!selectedTenant) return null;
    const now = new Date();
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    return calculateAdvancedKPIs(
      facturas.filter(f => f.empresaId === selectedTenant.id),
      gastos.filter(g => g.empresaId === selectedTenant.id),
      ingresos.filter(i => i.empresaId === selectedTenant.id),
      previousStart,
      previousEnd
    );
  }, [facturas, gastos, ingresos, selectedTenant]);

  // Meta de ventas (puede configurarse posteriormente)
  const salesTarget = 500000; // DOP
  
  if (!advancedKPIs) {
    return <div>Cargando datos analíticos...</div>;
  }

  // Calcular tendencias
  const getTrend = (current: number, previous: number | null) => {
    if (!previous || previous === 0) return undefined;
    const percentage = ((current - previous) / previous) * 100;
    return {
      current,
      previous,
      percentage: Math.abs(percentage),
      isPositive: percentage >= 0
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-secondary-800">Dashboard Analítico - {selectedTenant?.nombre}</h1>
        <div className="text-sm text-secondary-500">
          Última actualización: {new Date().toLocaleString('es-DO')}
        </div>
      </div>
      
      {/* KPIs Principales con Tendencias */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIWidget
          title="Ingresos del Mes"
          value={advancedKPIs.totalRevenue}
          formatter={formatCurrency}
          color="text-green-600"
          trend={getTrend(advancedKPIs.totalRevenue, previousMonthKPIs?.totalRevenue || null)}
          icon={<IngresosIcon className="h-5 w-5" />}
          subtitle="Facturación total"
        />
        <KPIWidget
          title="Gastos del Mes"
          value={advancedKPIs.totalExpenses}
          formatter={formatCurrency}
          color="text-red-600"
          trend={getTrend(advancedKPIs.totalExpenses, previousMonthKPIs?.totalExpenses || null)}
          icon={<ReportesIcon className="h-5 w-5" />}
          subtitle="Gastos operacionales"
        />
        <KPIWidget
          title="Ganancia Neta"
          value={advancedKPIs.netProfit}
          formatter={formatCurrency}
          color={advancedKPIs.netProfit >= 0 ? "text-green-600" : "text-red-600"}
          trend={getTrend(advancedKPIs.netProfit, previousMonthKPIs?.netProfit || null)}
          icon={<InformationCircleIcon className="h-5 w-5" />}
          subtitle="Ingresos - Gastos"
        />
        <KPIWidget
          title="Clientes Activos"
          value={timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1]?.clientes || 0 : 0}
          formatter={(v) => v.toString()}
          color="text-blue-600"
          icon={<ClientesIcon className="h-5 w-5" />}
          subtitle="Este período"
        />
      </div>

      {/* Meta de Ventas y Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SalesTargetWidget
          target={salesTarget}
          current={advancedKPIs.totalRevenue}
          period="Este Mes"
        />
        <AlertWidget alerts={advancedKPIs.alerts} />
      </div>

      {/* Métricas de Rendimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceMetrics 
            metrics={{
              averageInvoiceValue: advancedKPIs.averageInvoiceValue,
              collectionEfficiency: advancedKPIs.collectionEfficiency,
              expenseRatio: advancedKPIs.expenseRatio,
              profitMargin: advancedKPIs.grossMargin
            }}
          />
        </CardContent>
      </Card>

      {/* Información Fiscal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIWidget
          title="ITBIS a Pagar"
          value={advancedKPIs.taxLiability.itbis}
          formatter={formatCurrency}
          color={advancedKPIs.taxLiability.itbis > 0 ? "text-red-600" : "text-green-600"}
          subtitle="Diferencia ITBIS ventas vs compras"
        />
        <KPIWidget
          title="ISR Proyectado"
          value={advancedKPIs.taxLiability.isr}
          formatter={formatCurrency}
          color="text-orange-600"
          subtitle="27% sobre utilidades"
        />
        <KPIWidget
          title="Total Obligaciones Fiscales"
          value={advancedKPIs.taxLiability.total}
          formatter={formatCurrency}
          color="text-purple-600"
          subtitle="ITBIS + ISR estimado"
        />
      </div>

      {/* Gráficos Analíticos Avanzados */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CashFlowChart data={timeSeriesData} />
        <RevenueBreakdown data={revenueBreakdown} />
      </div>

      {/* Mensaje cuando no hay datos suficientes */}
      {timeSeriesData.length === 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Análisis Histórico no Disponible</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-500">
              No hay suficientes datos históricos para mostrar tendencias. 
              Los gráficos analíticos aparecerán cuando tengas más datos de ventas y gastos.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;