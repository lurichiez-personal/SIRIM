import React from 'react';
import { Link } from 'react-router-dom';
import { useChartOfAccountsStore } from '../../stores/useChartOfAccountsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CuentaContable, AccountType } from '../../types';

const CatalogoCuentasPage: React.FC = () => {
    const { cuentas } = useChartOfAccountsStore();

    const renderCuentas = (tipo: AccountType) => {
        const cuentasDelTipo = cuentas.filter(c => c.tipo === tipo && !c.padreId);
        return (
            <div>
                <h3 className="text-xl font-semibold mb-2 text-primary">{tipo}</h3>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre de Cuenta</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Permite Mov.</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {renderRows(cuentasDelTipo, 0)}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    const renderRows = (cuentasParaRender: CuentaContable[], level: number) => {
        let rows: JSX.Element[] = [];
        cuentasParaRender.forEach(cuenta => {
            rows.push(
                <tr key={cuenta.id} className={!cuenta.permiteMovimientos ? 'bg-secondary-50' : ''}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono" style={{ paddingLeft: `${1.5 + level * 1.5}rem`}}>{cuenta.id}</td>
                    <td className={`px-6 py-3 whitespace-nowrap text-sm ${!cuenta.permiteMovimientos ? 'font-bold' : ''}`}>{cuenta.nombre}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-center">{cuenta.permiteMovimientos ? 'Sí' : 'No'}</td>
                </tr>
            );
            const children = cuentas.filter(c => c.padreId === cuenta.id);
            if (children.length > 0) {
                rows = rows.concat(renderRows(children, level + 1));
            }
        });
        return rows;
    }
    
    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Catálogo de Cuentas</h1>
            <div className="space-y-8">
                {renderCuentas('Activo')}
                {renderCuentas('Pasivo')}
                {renderCuentas('Capital')}
                {renderCuentas('Ingreso')}
                {renderCuentas('Costo')}
                {renderCuentas('Gasto')}
            </div>
        </div>
    );
};

export default CatalogoCuentasPage;
