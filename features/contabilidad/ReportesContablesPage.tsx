import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { useChartOfAccountsStore } from '../../stores/useChartOfAccountsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AccountType, CuentaContable, AsientoContable } from '../../types';
import { DatePreset, getDateRange } from '../../utils/dateUtils';

const ReportesContablesPage: React.FC = () => {
    const { asientosContables } = useDataStore();
    const { cuentas } = useChartOfAccountsStore();

    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        const range = getDateRange(datePreset);
        setFilters({ startDate: range.start, endDate: range.end });
    }, [datePreset]);

    const handleFilterChange = (field: 'startDate' | 'endDate', value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setDatePreset('custom');
    };

    const formatCurrency = (value: number) => {
        const formatted = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(value));
        return value < 0 ? `(${formatted})` : formatted;
    };

    const { balanceSheetBalances, incomeStatementBalances } = useMemo(() => {
        // Balance Sheet includes ALL transactions up to the end date.
        const balanceSheetAsientos = filters.endDate 
            ? asientosContables.filter(a => a.fecha <= filters.endDate)
            : asientosContables;

        // Income Statement includes only transactions WITHIN the date range.
        const incomeStatementAsientos = asientosContables.filter(a => 
            (!filters.startDate || a.fecha >= filters.startDate) &&
            (!filters.endDate || a.fecha <= filters.endDate)
        );

        const calculateBalances = (asientos: AsientoContable[]) => {
            const balances: { [key: string]: number } = {};
            cuentas.forEach(c => balances[c.id] = 0);
            asientos.forEach(asiento => {
                asiento.entradas.forEach(entrada => {
                    balances[entrada.cuentaId] = (balances[entrada.cuentaId] || 0) + entrada.debito - entrada.credito;
                });
            });
            return balances;
        };
        
        const bsBalances = calculateBalances(balanceSheetAsientos);
        const isBalances = calculateBalances(incomeStatementAsientos);
        
        // Propagate balances up for both sets
        const propagate = (balancesToPropagate: { [key: string]: number }) => {
            const processedBalances = { ...balancesToPropagate };
            const runPropagation = (cuentaId: string) => {
                const children = cuentas.filter(c => c.padreId === cuentaId);
                // For accounts that allow direct transactions, start with their own balance.
                const selfBalance = processedBalances[cuentaId] || 0;
                // Sum up propagated balances from children.
                const childrenSum = children.reduce((sum, child) => sum + runPropagation(child.id), 0);
                const totalBalance = selfBalance + childrenSum;
                processedBalances[cuentaId] = totalBalance;
                return totalBalance;
            };
            cuentas.filter(c => !c.padreId).forEach(root => runPropagation(root.id));
            return processedBalances;
        };

        return { 
            balanceSheetBalances: propagate(bsBalances), 
            incomeStatementBalances: propagate(isBalances)
        };
    }, [asientosContables, cuentas, filters.startDate, filters.endDate]);
    
    const resultadoDelPeriodo = (incomeStatementBalances['4'] || 0) - (incomeStatementBalances['5'] || 0) - (incomeStatementBalances['6'] || 0);

    const renderReportSection = (balances: {[key:string]: number}, tipo: AccountType, title: string, level = 0): React.ReactNode[] => {
        const rootCuentas = cuentas.filter(c => c.tipo === tipo && !c.padreId);
        let elements: React.ReactNode[] = [<h3 key={title} className="text-lg font-bold mt-4">{title}</h3>];
        rootCuentas.forEach(cuenta => {
             elements = elements.concat(renderAccountRow(balances, cuenta, level));
        });
        return elements;
    };

    const renderAccountRow = (balances: {[key:string]: number}, cuenta: CuentaContable, level: number): React.ReactNode[] => {
        const balance = balances[cuenta.id] || 0;
        if(Math.abs(balance) < 0.01 && cuenta.permiteMovimientos) return [];
        
        let rows: React.ReactNode[] = [];
        const displayBalance = (cuenta.tipo === 'Ingreso' || cuenta.tipo === 'Capital' || cuenta.tipo === 'Pasivo') ? balance * -1 : balance;

        rows.push(
            <div key={cuenta.id} className="flex justify-between py-1 border-b border-dotted">
                <span style={{ paddingLeft: `${level * 1.5}rem` }} className={!cuenta.permiteMovimientos ? 'font-semibold' : ''}>
                    {cuenta.nombre}
                </span>
                <span className={`font-mono ${!cuenta.permiteMovimientos ? 'font-semibold' : ''}`}>
                    { displayBalance !== 0 ? formatCurrency(displayBalance) : '-' }
                </span>
            </div>
        );

        const children = cuentas.filter(c => c.padreId === cuenta.id);
        children.forEach(child => {
            rows = rows.concat(renderAccountRow(balances, child, level + 1));
        });
        
        return rows;
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/dashboard/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Reportes Financieros</h1>
            
            <Card className="mb-6">
                 <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-secondary-700">Seleccionar Período</label>
                             <select className="mt-1 w-full px-3 py-2 border border-secondary-300 rounded-md" value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)}>
                                <option value="this_month">Este Mes</option>
                                <option value="last_month">Mes Pasado</option>
                                <option value="this_quarter">Este Trimestre</option>
                                <option value="this_year">Este Año</option>
                                <option value="custom">Rango Personalizado</option>
                            </select>
                        </div>
                        {datePreset === 'custom' && (
                           <>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700">Desde</label>
                                <input type="date" className="mt-1 w-full px-3 py-2 border border-secondary-300 rounded-md" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-secondary-700">Hasta</label>
                                <input type="date" className="mt-1 w-full px-3 py-2 border border-secondary-300 rounded-md" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                            </div>
                           </>
                        )}
                    </div>
                 </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader><CardTitle>Estado de Resultados</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {renderReportSection(incomeStatementBalances, 'Ingreso', 'Ingresos')}
                        {renderReportSection(incomeStatementBalances, 'Costo', 'Costo de Venta')}
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black">
                            <span>Beneficio Bruto</span>
                            <span className="font-mono">{formatCurrency((incomeStatementBalances['4'] || 0) - (incomeStatementBalances['5'] || 0))}</span>
                        </div>
                        {renderReportSection(incomeStatementBalances, 'Gasto', 'Gastos Operacionales')}
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black">
                            <span>Beneficio Neto del Período</span>
                            <span className="font-mono">{formatCurrency(resultadoDelPeriodo)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Estado de Situación (Balance General)</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {renderReportSection(balanceSheetBalances, 'Activo', 'Activos')}
                        <div className="flex justify-between font-bold text-base py-1 border-t-2 border-black">
                            <span>Total Activos</span>
                            <span className="font-mono">{formatCurrency(balanceSheetBalances['1'])}</span>
                        </div>

                        {renderReportSection(balanceSheetBalances, 'Pasivo', 'Pasivos')}
                        <div className="flex justify-between font-bold text-base py-1 border-t">
                            <span>Total Pasivos</span>
                            <span className="font-mono">{formatCurrency(balanceSheetBalances['2'] * -1)}</span>
                        </div>
                        
                        {renderReportSection(balanceSheetBalances, 'Capital', 'Capital')}
                         <div className="flex justify-between py-1 border-b border-dotted">
                            <span>+ Resultado del Período</span>
                            <span className="font-mono">{formatCurrency(resultadoDelPeriodo)}</span>
                        </div>
                         <div className="flex justify-between font-bold text-base py-1 border-t">
                            <span>Total Capital</span>
                            <span className="font-mono">{formatCurrency((balanceSheetBalances['3'] * -1) + resultadoDelPeriodo)}</span>
                        </div>
                        
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black mt-4">
                            <span>Total Pasivo y Capital</span>
                            <span className="font-mono">{formatCurrency((balanceSheetBalances['2'] * -1) + (balanceSheetBalances['3'] * -1) + resultadoDelPeriodo)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReportesContablesPage;