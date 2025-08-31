

import React, { useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const DashboardPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();
  const { getKpis } = useDataStore();
  const { settings } = useSettingsStore();

  const tenantSettings = useMemo(() => {
    if (selectedTenant) return settings[selectedTenant.id];
    return { accentColor: '#005A9C' };
  }, [selectedTenant, settings]);

  const kpis = useMemo(() => getKpis(), [getKpis]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
  };
  
  // Mock data for charts - in a real app, this would come from the store as well
  const salesVsExpensesData = [
      { name: 'Ene', ventas: 4000, gastos: 2400 },
      { name: 'Feb', ventas: 3000, gastos: 1398 },
      { name: 'Mar', ventas: 2000, gastos: 9800 },
      { name: 'Abr', ventas: 2780, gastos: 3908 },
      { name: 'May', ventas: 1890, gastos: 4800 },
  ];
  const gastosByCategoryData = [
      { name: 'Compras', value: 400 },
      { name: 'Servicios', value: 300 },
      { name: 'Arrendamientos', value: 300 },
      { name: 'Personal', value: 200 },
  ];
  
  return (
    <div>
      <h1 className="text-3xl font-bold text-secondary-800 mb-6">Dashboard de {selectedTenant?.nombre}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI Cards */}
        <Card>
          <CardHeader><CardTitle>Total Cobrado (mes)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-green-600">{formatCurrency(kpis.totalCobrado)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total Gastos (mes)</CardTitle></CardHeader>
          <CardContent><p className="text-3xl font-bold text-red-600">{formatCurrency(kpis.gastosMes)}</p></CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Beneficio/Pérdida (Mes)</CardTitle></CardHeader>
            <CardContent>
                <p className={`text-3xl font-bold ${kpis.beneficioPerdida >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(kpis.beneficioPerdida)}
                </p>
                <p className="text-xs text-secondary-500 mt-1">Cobros - Gastos</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle>Cuentas por Cobrar</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(kpis.cuentasPorCobrar)}</p>
                <p className="text-xs text-secondary-500 mt-1">Total pendiente de clientes</p>
            </CardContent>
         </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
         {/* Financial Health Cards */}
         <Card>
            <CardHeader><CardTitle>Activos (Estimado)</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(kpis.activos)}</p>
                <p className="text-xs text-secondary-500 mt-1">Cuentas por Cobrar + Inventario</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle>Patrimonio (Estimado)</CardTitle></CardHeader>
            <CardContent>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(kpis.patrimonio)}</p>
                <p className="text-xs text-secondary-500 mt-1">Total Cobrado - Total Gastado (Histórico)</p>
            </CardContent>
         </Card>
         <Card>
            <CardHeader><CardTitle>Proyección Impuestos (Mes)</CardTitle></CardHeader>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Ventas vs. Gastos (Últimos meses)</CardTitle></CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesVsExpensesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="ventas" fill={tenantSettings?.accentColor || '#005A9C'} name="Ventas"/>
                        <Bar dataKey="gastos" fill="#A0AEC0" name="Gastos"/>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle>Gastos por Categoría</CardTitle></CardHeader>
            <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={gastosByCategoryData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name">
                            {gastosByCategoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;