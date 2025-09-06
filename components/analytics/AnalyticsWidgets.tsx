import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { InformationCircleIcon, ChevronDownIcon } from '../icons/Icons';

export interface MetricTrend {
  current: number;
  previous: number;
  percentage: number;
  isPositive: boolean;
}

export interface KPIWidgetProps {
  title: string;
  value: number;
  trend?: MetricTrend;
  formatter?: (value: number) => string;
  color?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const KPIWidget: React.FC<KPIWidgetProps> = ({ 
  title, 
  value, 
  trend, 
  formatter = (v) => v.toLocaleString(), 
  color = 'text-primary-600',
  subtitle,
  icon 
}) => {
  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-secondary-600">{title}</CardTitle>
          {icon && <div className="text-secondary-400">{icon}</div>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-baseline justify-between">
          <p className={`text-2xl font-bold ${color}`}>
            {formatter(value)}
          </p>
          {trend && (
            <div className={`flex items-center text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend.isPositive ? (
                <span className="text-xs mr-1">↗</span>
              ) : (
                <span className="text-xs mr-1">↘</span>
              )}
              {Math.abs(trend.percentage).toFixed(1)}%
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-secondary-500 mt-1">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
};

interface AlertWidgetProps {
  alerts: Array<{
    title: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    value?: string;
  }>;
}

export const AlertWidget: React.FC<AlertWidgetProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-secondary-600">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-600 text-sm">✓ Todo está en orden</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-sm font-medium text-secondary-600">
          <InformationCircleIcon className="h-4 w-4 mr-2" />
          Alertas ({alerts.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.slice(0, 3).map((alert, index) => (
          <div key={index} className={`p-3 rounded-md border-l-4 ${
            alert.severity === 'high' ? 'bg-red-50 border-red-400' :
            alert.severity === 'medium' ? 'bg-yellow-50 border-yellow-400' :
            'bg-blue-50 border-blue-400'
          }`}>
            <h4 className={`text-sm font-medium ${
              alert.severity === 'high' ? 'text-red-800' :
              alert.severity === 'medium' ? 'text-yellow-800' :
              'text-blue-800'
            }`}>
              {alert.title}
            </h4>
            <p className={`text-xs mt-1 ${
              alert.severity === 'high' ? 'text-red-600' :
              alert.severity === 'medium' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {alert.message}
            </p>
            {alert.value && (
              <p className={`text-sm font-semibold mt-1 ${
                alert.severity === 'high' ? 'text-red-800' :
                alert.severity === 'medium' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {alert.value}
              </p>
            )}
          </div>
        ))}
        {alerts.length > 3 && (
          <p className="text-xs text-secondary-500">
            +{alerts.length - 3} alertas más...
          </p>
        )}
      </CardContent>
    </Card>
  );
};

interface CashFlowChartProps {
  data: Array<{
    period: string;
    ingresos: number;
    gastos: number;
    flujo: number;
  }>;
}

export const CashFlowChart: React.FC<CashFlowChartProps> = ({ data }) => {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Flujo de Efectivo</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis tickFormatter={(value) => `$${Number(value) / 1000}k`} />
            <Tooltip 
              formatter={(value: number) => [
                new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value),
                ''
              ]}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="ingresos" 
              stackId="1" 
              stroke="#10b981" 
              fill="#10b981" 
              fillOpacity={0.6}
              name="Ingresos"
            />
            <Area 
              type="monotone" 
              dataKey="gastos" 
              stackId="2" 
              stroke="#ef4444" 
              fill="#ef4444" 
              fillOpacity={0.6}
              name="Gastos"
            />
            <Line 
              type="monotone" 
              dataKey="flujo" 
              stroke="#3b82f6" 
              strokeWidth={3}
              name="Flujo Neto"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface RevenueBreakdownProps {
  data: Array<{
    source: string;
    amount: number;
    percentage: number;
  }>;
}

export const RevenueBreakdown: React.FC<RevenueBreakdownProps> = ({ data }) => {
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ingresos por Fuente</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percentage }) => `${percentage.toFixed(1)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
              nameKey="source"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [
                new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value),
                ''
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

interface PerformanceMetricsProps {
  metrics: {
    averageInvoiceValue: number;
    collectionEfficiency: number;
    expenseRatio: number;
    profitMargin: number;
  };
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ metrics }) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <KPIWidget
        title="Factura Promedio"
        value={metrics.averageInvoiceValue}
        formatter={formatCurrency}
        color="text-blue-600"
        subtitle="Valor promedio por factura"
      />
      <KPIWidget
        title="Eficiencia de Cobro"
        value={metrics.collectionEfficiency}
        formatter={formatPercentage}
        color={metrics.collectionEfficiency > 0.8 ? "text-green-600" : "text-yellow-600"}
        subtitle="Facturas cobradas vs emitidas"
      />
      <KPIWidget
        title="Ratio de Gastos"
        value={metrics.expenseRatio}
        formatter={formatPercentage}
        color={metrics.expenseRatio < 0.7 ? "text-green-600" : "text-red-600"}
        subtitle="Gastos / Ingresos"
      />
      <KPIWidget
        title="Margen de Ganancia"
        value={metrics.profitMargin}
        formatter={formatPercentage}
        color={metrics.profitMargin > 0.2 ? "text-green-600" : "text-red-600"}
        subtitle="Ganancia neta / Ingresos"
      />
    </div>
  );
};

interface SalesTargetProps {
  target: number;
  current: number;
  period: string;
}

export const SalesTargetWidget: React.FC<SalesTargetProps> = ({ target, current, period }) => {
  const percentage = (current / target) * 100;
  const isOnTarget = percentage >= 80; // 80% o más se considera en camino
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta de Ventas - {period}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-secondary-600">Actual</span>
            <span className="text-lg font-semibold">
              {new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(current)}
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-secondary-600">Meta</span>
            <span className="text-lg font-semibold">
              {new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(target)}
            </span>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-secondary-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-500 ${
                percentage >= 100 ? 'bg-green-500' : 
                percentage >= 80 ? 'bg-blue-500' : 
                percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center">
            <span className={`text-sm font-medium ${
              isOnTarget ? 'text-green-600' : 'text-red-600'
            }`}>
              {percentage.toFixed(1)}% completado
            </span>
            <span className="text-xs text-secondary-500">
              Faltan {new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(Math.max(0, target - current))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};