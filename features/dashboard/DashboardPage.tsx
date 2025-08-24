
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../../components/ui/Card';
import { useTenantStore } from '../../stores/useTenantStore';

const DashboardPage: React.FC = () => {
  const { selectedTenant } = useTenantStore();

  // TODO: Estos datos deben venir de la API (React Query) y ser filtrados por el tenantId
  const kpis = {
    totalFacturado: 1250000.75,
    totalCobrado: 980500.50,
    gastosMes: 350000.00,
    facturasPendientes: 15,
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-secondary-800 mb-6">Dashboard de {selectedTenant?.nombre}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Facturado (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(kpis.totalFacturado)}</p>
            <p className="text-sm text-secondary-500 mt-1">+5.2% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Cobrado (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(kpis.totalCobrado)}</p>
            <p className="text-sm text-secondary-500 mt-1">Tasa de cobro: 78.4%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Total Gastos (mes)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(kpis.gastosMes)}</p>
            <p className="text-sm text-secondary-500 mt-1">-1.5% vs mes anterior</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Facturas Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">{kpis.facturasPendientes}</p>
            <p className="text-sm text-secondary-500 mt-1">Monto pendiente: {formatCurrency(kpis.totalFacturado - kpis.totalCobrado)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-secondary-600">// TODO: Aquí irá una lista de las últimas transacciones y eventos.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;