import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { useChartOfAccountsStore } from '../../stores/useChartOfAccountsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AccountType, CuentaContable } from '../../types';

const ReportesContablesPage: React.FC = () => {
    const { asientosContables } = useDataStore();
    const { cuentas } = useChartOfAccountsStore();

    const formatCurrency = (value: number) => {
        const formatted = new Intl.NumberFormat('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
        return value < 0 ? `(${formatted.replace('-', '')})` : formatted;
    };

    const balances = useMemo(() => {
        const accountBalances: { [key: string]: number } = {};
        cuentas.forEach(c => accountBalances[c.id] = 0);

        asientosContables.forEach(asiento => {
            asiento.entradas.forEach(entrada => {
                accountBalances[entrada.cuentaId] = (accountBalances[entrada.cuentaId] || 0) + entrada.debito - entrada.credito;
            });
        });

        // Propagate balances up to parent accounts
        const propagate = (cuentaId: string) => {
            const children = cuentas.filter(c => c.padreId === cuentaId);
            if (children.length === 0) {
                return accountBalances[cuentaId] || 0;
            }
            const childrenSum = children.reduce((sum, child) => sum + propagate(child.id), 0);
            accountBalances[cuentaId] = childrenSum;
            return childrenSum;
        };
        
        cuentas.filter(c => !c.padreId).forEach(root => propagate(root.id));

        return accountBalances;

    }, [asientosContables, cuentas]);
    
    const resultadoDelPeriodo = (balances['4'] || 0) - (balances['5'] || 0) - (balances['6'] || 0);

    const renderReportSection = (tipo: AccountType, title: string, level = 0, isSubSection = false): JSX.Element[] => {
        const rootCuentas = cuentas.filter(c => c.tipo === tipo && (isSubSection ? c.padreId : !c.padreId));
        
        let elements: JSX.Element[] = [];
        if (!isSubSection) {
            elements.push(<h3 key={title} className="text-lg font-bold mt-4">{title}</h3>);
        }

        rootCuentas.forEach(cuenta => {
             elements = elements.concat(renderAccountRow(cuenta, level));
        });

        return elements;
    };

    const renderAccountRow = (cuenta: CuentaContable, level: number): JSX.Element[] => {
        const balance = balances[cuenta.id] || 0;
        let rows: JSX.Element[] = [];

        // For Income Statement, flip sign of contra-accounts and revenues
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
            rows = rows.concat(renderAccountRow(child, level + 1));
        });
        
        return rows;
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Reportes Financieros</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card>
                    <CardHeader><CardTitle>Estado de Resultados</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {renderReportSection('Ingreso', 'Ingresos')}
                        {renderReportSection('Costo', 'Costo de Venta')}
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black">
                            <span>Beneficio Bruto</span>
                            <span className="font-mono">{formatCurrency((balances['4'] || 0) - (balances['5'] || 0))}</span>
                        </div>
                        {renderReportSection('Gasto', 'Gastos Operacionales')}
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black">
                            <span>Beneficio Neto del Período</span>
                            <span className="font-mono">{formatCurrency(resultadoDelPeriodo)}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle>Estado de Situación (Balance General)</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {renderReportSection('Activo', 'Activos')}
                        <div className="flex justify-between font-bold text-base py-1 border-t-2 border-black">
                            <span>Total Activos</span>
                            <span className="font-mono">{formatCurrency(balances['1'])}</span>
                        </div>

                        {renderReportSection('Pasivo', 'Pasivos')}
                        <div className="flex justify-between font-bold text-base py-1 border-t">
                            <span>Total Pasivos</span>
                            <span className="font-mono">{formatCurrency(balances['2'] * -1)}</span>
                        </div>
                        
                        {renderReportSection('Capital', 'Capital')}
                         <div className="flex justify-between py-1 border-b border-dotted">
                            <span>+ Resultado del Período</span>
                            <span className="font-mono">{formatCurrency(resultadoDelPeriodo)}</span>
                        </div>
                         <div className="flex justify-between font-bold text-base py-1 border-t">
                            <span>Total Capital</span>
                            <span className="font-mono">{formatCurrency((balances['3'] * -1) + resultadoDelPeriodo)}</span>
                        </div>
                        
                        <div className="flex justify-between font-bold text-base py-1 border-y-2 border-black mt-4">
                            <span>Total Pasivo y Capital</span>
                            <span className="font-mono">{formatCurrency((balances['2'] * -1) + (balances['3'] * -1) + resultadoDelPeriodo)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default ReportesContablesPage;
