
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useChartOfAccountsStore } from '../../stores/useChartOfAccountsStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { CuentaContable, AccountType } from '../../types';

const CatalogoCuentasPage: React.FC = () => {
    const { cuentas } = useChartOfAccountsStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [movimientosFilter, setMovimientosFilter] = useState<'todos' | 'si' | 'no'>('todos');

    const filteredCuentas = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        let finalCuentas = new Set<CuentaContable>();

        if (!searchTerm && movimientosFilter === 'todos') {
            return cuentas;
        }
        
        // Find matching accounts
        const matched = cuentas.filter(c => {
            const matchesSearch = searchTerm ? c.nombre.toLowerCase().includes(lowerTerm) || c.id.includes(lowerTerm) : true;
            const matchesMovimientos = 
                movimientosFilter === 'todos' ? true : 
                movimientosFilter === 'si' ? c.permiteMovimientos : !c.permiteMovimientos;
            return matchesSearch && matchesMovimientos;
        });

        // Add all ancestors of matched accounts to ensure hierarchy is visible
        const getAncestors = (cuentaId: string, allCuentas: CuentaContable[]) => {
            let ancestors = new Set<CuentaContable>();
            let current = allCuentas.find(c => c.id === cuentaId);
            while (current && current.padreId) {
                const parent = allCuentas.find(c => c.id === current!.padreId);
                if (parent) {
                    ancestors.add(parent);
                    current = parent;
                } else {
                    current = undefined;
                }
            }
            return ancestors;
        };
        
        matched.forEach(c => {
            finalCuentas.add(c);
            getAncestors(c.id, cuentas).forEach(ancestor => finalCuentas.add(ancestor));
        });

        return Array.from(finalCuentas);

    }, [cuentas, searchTerm, movimientosFilter]);


    const renderCuentas = (tipo: AccountType) => {
        const cuentasDelTipo = filteredCuentas.filter(c => c.tipo === tipo && !c.padreId);
        const allCuentasDelTipo = filteredCuentas.filter(c => c.tipo === tipo);

        if(allCuentasDelTipo.length === 0) return null;

        return (
            <div>
                <h3 className="text-xl font-semibold mb-2 text-primary">{tipo}</h3>
                <div className="overflow-x-auto border rounded-lg">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                             <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase w-32">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre de Cuenta</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase w-24">Nivel</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase w-32">Mov.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase w-32">Cat. DGII</th>
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

    const renderRows = (cuentasParaRender: CuentaContable[], level: number): React.ReactNode[] => {
        let rows: React.ReactNode[] = [];
        cuentasParaRender.forEach(cuenta => {
             if (!filteredCuentas.some(fc => fc.id === cuenta.id)) return;

            rows.push(
                <tr key={cuenta.id} className={!cuenta.permiteMovimientos ? 'bg-secondary-50' : ''}>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono font-semibold text-secondary-700">{cuenta.id}</td>
                    <td className={`px-6 py-3 whitespace-nowrap text-sm ${!cuenta.permiteMovimientos ? 'font-bold' : ''}`} style={{ paddingLeft: `${1.5 + level * 1.5}rem`}}>
                        {cuenta.nombre}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-center text-secondary-500">{cuenta.nivel}</td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${cuenta.permiteMovimientos ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {cuenta.permiteMovimientos ? 'Sí' : 'No'}
                        </span>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap text-sm font-mono text-primary-700 font-medium">
                        {cuenta.categoriaDGII || '-'}
                    </td>
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
                <Link to="/dashboard/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Catálogo de Cuentas</h1>
            <Card>
                <CardHeader>
                     <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o ID..."
                            className="w-full md:w-1/2 px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <select
                            className="w-full md:w-auto px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={movimientosFilter}
                            onChange={(e) => setMovimientosFilter(e.target.value as any)}
                        >
                            <option value="todos">Todas las cuentas</option>
                            <option value="si">Solo cuentas de movimiento</option>
                            <option value="no">Solo cuentas de control</option>
                        </select>
                    </div>
                </CardHeader>
                 <CardContent className="space-y-8">
                    {renderCuentas('Activo')}
                    {renderCuentas('Pasivo')}
                    {renderCuentas('Capital')}
                    {renderCuentas('Ingreso')}
                    {renderCuentas('Costo')}
                    {renderCuentas('Gasto')}
                </CardContent>
            </Card>
        </div>
    );
};

export default CatalogoCuentasPage;
