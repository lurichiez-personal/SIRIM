
import React, { useMemo, useState } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card.tsx';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatCurrency } from '../../utils/formatters.ts';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button.tsx';
import { ConfiguracionIcon } from '../../components/icons/Icons.tsx';
import CustomizeDashboardModal from './CustomizeDashboardModal.tsx';
import { useDashboardSettingsStore } from '../../stores/useDashboardSettingsStore.ts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const dataStore = useDataStore();
  const { hiddenCards } = useDashboardSettingsStore();
  const [isCustomizeModalOpen, setIsCustomizeModalOpen] = useState(false);

  const accentColor = useMemo(() => {
    return selectedTenant?.accentColor || '#005A9C';
  }, [selectedTenant]);

  const kpis = useMemo(() => dataStore.getKpis(), [dataStore]);
  const salesVsExpensesData = useMemo(() => dataStore.getSalesVsExpensesChartData(), [dataStore]);
  const gastosByCategoryData = useMemo(() => dataStore.getGastosByCategoryChartData(), [dataStore]);
  const monthlyITBISData = useMemo(() => dataStore.getMonthlyITBISData(), [dataStore]);
  const anticiposISRData = useMemo(() => dataStore.getAnticiposISRData(), [dataStore]);

  const formatCurrencyForTooltip = (value: number) => {
    if (isNaN(value)) value = 0;
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
  };
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-secondary-800">Dashboard de {selectedTenant?.nombre}</h1>
        <Button variant="secondary" onClick={() => setIsCustomizeModalOpen(true)} leftIcon={<ConfiguracionIcon />}>
          Personalizar
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {!hiddenCards.has('kpi_cobrado') && (
            <Card>
              <CardHeader><CardTitle>Total Cobrado (Periodo Fiscal)</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-green-600">{formatCurrency(kpis.totalCobrado)}</p></CardContent>
            </Card>
        )}
        {!hiddenCards.has('kpi_gastos') && (
            <Card>
              <CardHeader><CardTitle>Total Gastos (Periodo Fiscal)</CardTitle></CardHeader>
              <CardContent><p className="text-3xl font-bold text-red-600">{formatCurrency(kpis.gastosMes)}</p></CardContent>
            </Card>
        )}
        {!hiddenCards.has('kpi_beneficio') && (
            <Card>
                <CardHeader><CardTitle>Beneficio/Pérdida (Periodo Fiscal)</CardTitle></CardHeader>
                <CardContent>
                    <p className={`text-3xl font-bold ${kpis.beneficioPerdida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(kpis.beneficioPerdida)}
                    </p>
                    <p className="text-xs text-secondary-500 mt-1">Cobros - Gastos del periodo</p>
                </CardContent>
             </Card>
        )}
        {!hiddenCards.has('kpi_por_cobrar') && (
             <Card>
                <CardHeader><CardTitle>Cuentas por Cobrar</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-yellow-600">{formatCurrency(kpis.cuentasPorCobrar)}</p>
                    <p className="text-xs text-secondary-500 mt-1">Total pendiente de clientes</p>
                </CardContent>
             </Card>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mt-6">
        {!hiddenCards.has('health_activos') && (
             <Card>
                <CardHeader><CardTitle>Activos (Estimado)</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-blue-600">{formatCurrency(kpis.activos)}</p>
                    <p className="text-xs text-secondary-500 mt-1">Cuentas por Cobrar + Inventario</p>
                </CardContent>
             </Card>
        )}
        {!hiddenCards.has('health_anticipo_isr') && (
            <Card>
                <CardHeader><CardTitle>Próximo Anticipo ISR</CardTitle></CardHeader>
                <CardContent>
                    {anticiposISRData.proximoPago ? (
                        <>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(anticiposISRData.proximoPago.monto)}</p>
                            <p className="text-xs text-secondary-500 mt-1">
                                Vence el {new Date(anticiposISRData.proximoPago.fechaLimite + 'T00:00:00').toLocaleDateString('es-DO')}
                            </p>
                            <Link to="/dashboard/contabilidad/anticipos-isr" className="text-xs text-primary hover:underline mt-2 block">Ver detalles</Link>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-secondary-500">No hay anticipos pendientes o no se ha configurado el impuesto liquidado anterior.</p>
                            <Link to="/dashboard/configuracion/empresas" className="text-xs text-primary hover:underline mt-2 block">Configurar</Link>
                        </>
                    )}
                </CardContent>
            </Card>
        )}
        {!hiddenCards.has('health_patrimonio') && (
             <Card>
                <CardHeader><CardTitle>Patrimonio (Estimado)</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(kpis.patrimonio)}</p>
                    <p className="text-xs text-secondary-500 mt-1">Total Cobrado - Total Gastado (Histórico)</p>
                </CardContent>
             </Card>
        )}
        {!hiddenCards.has('health_impuestos') && (
             <Card>
                <CardHeader><CardTitle>Proyección Impuestos (Periodo)</CardTitle></CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <div>
                            <p className="text-xs text-secondary-500">ITBIS a Pagar</p>
                            <p className={`text-lg font-bold ${kpis.itbisAPagar.total >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(kpis.itbisAPagar.total)}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-secondary-500">ISR Proyectado (27%)</p>
                            <p className="text-lg font-bold text-red-600">{formatCurrency(kpis.isrProyectado)}</p>
                        </div>
                    </div>
                </CardContent>
             </Card>
        )}
        {!hiddenCards.has('health_itbis_no_deducible') && (
             <Card>
                <CardHeader><CardTitle>ITBIS No Deducible (B02)</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(kpis.gastosConsumidorFinal.totalItbis)}</p>
                    <p className="text-xs text-secondary-500 mt-1">
                        En {kpis.gastosConsumidorFinal.count} {kpis.gastosConsumidorFinal.count === 1 ? 'factura' : 'facturas'} de consumo este periodo.
                    </p>
                </CardContent>
             </Card>
        )}
      </div>

        <div className="mt-8">
            <h2 className="text-xl font-bold text-secondary-800 mb-4">Resumen Mensual de ITBIS (Periodo Fiscal)</h2>
            <div className="flex overflow-x-auto space-x-4 pb-4 -mx-4 px-4">
                {monthlyITBISData.map(monthData => (
                    <div key={monthData.monthName} className="flex-shrink-0 w-48 bg-white p-4 rounded-lg shadow-md">
                        <p className="font-semibold text-secondary-700">{monthData.monthName}</p>
                        <p className={`text-2xl font-bold ${monthData.itbisPayable > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Math.abs(monthData.itbisPayable))}
                        </p>
                        <p className="text-xs text-secondary-500">{monthData.itbisPayable > 0 ? 'Por Pagar' : 'Saldo a Favor'}</p>
                    </div>
                ))}
                {monthlyITBISData.length === 0 && (
                    <p className="text-sm text-secondary-500">No hay datos para mostrar el resumen mensual de ITBIS.</p>
                )}
            </div>
        </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Ingresos vs. Gastos (Periodo Fiscal)</CardTitle></CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesVsExpensesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => formatCurrencyForTooltip(value)} />
                        <Legend />
                        <Bar dataKey="ventas" fill={accentColor} name="Ingresos"/>
                        <Bar dataKey="gastos" fill="#A0AEC0" name="Gastos"/>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Gastos por Categoría (Periodo Fiscal)</CardTitle></CardHeader>
            <CardContent className="h-80">
                {gastosByCategoryData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-sm text-secondary-500">
                        No hay datos de gastos para este periodo.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={gastosByCategoryData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name">
                                {gastosByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(value: number) => formatCurrencyForTooltip(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
      </div>
      <CustomizeDashboardModal isOpen={isCustomizeModalOpen} onClose={() => setIsCustomizeModalOpen(false)} />
    </div>
  );
};

export default DashboardPage;
