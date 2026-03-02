
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { AsientoContable } from '../../types';
import Pagination from '../../components/ui/Pagination';
import { applyPagination } from '../../utils/pagination';

const ITEMS_PER_PAGE = 10;

const LibroDiarioPage: React.FC = () => {
    const { asientosContables, isLoading } = useDataStore();
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({
        searchTerm: '',
        startDate: '',
        endDate: '',
        transactionType: 'todos'
    });

    const transactionTypes = useMemo(() => {
        const types = new Set(asientosContables.map(a => a.transaccionTipo).filter(t => t));
        return Array.from(types) as string[];
    }, [asientosContables]);

    const pagedData = useMemo(() => {
        let filtered = [...asientosContables];

        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(a => 
                a.descripcion.toLowerCase().includes(lowerTerm) || 
                a.transaccionId.toLowerCase().includes(lowerTerm)
            );
        }
        if (filters.startDate) {
            filtered = filtered.filter(a => a.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(a => a.fecha <= filters.endDate);
        }
        if (filters.transactionType !== 'todos') {
            filtered = filtered.filter(a => a.transaccionTipo === filters.transactionType);
        }

        const sorted = filtered.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        return applyPagination(sorted, currentPage, ITEMS_PER_PAGE);
    }, [asientosContables, currentPage, filters]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/dashboard/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Libro Diario</h1>
            
            <Card>
                <CardHeader>
                    <CardTitle>Asientos Contables</CardTitle>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="Buscar por descripción, referencia..."
                            className="md:col-span-2 px-3 py-2 border border-secondary-300 rounded-md"
                            value={filters.searchTerm}
                            onChange={e => handleFilterChange('searchTerm', e.target.value)}
                        />
                         <select
                            className="px-3 py-2 border border-secondary-300 rounded-md"
                            value={filters.transactionType}
                            onChange={e => handleFilterChange('transactionType', e.target.value)}
                        >
                            <option value="todos">Todos los tipos</option>
                            {transactionTypes.map((type: string) => (
                                <option key={type} value={type}>{(type || '').charAt(0).toUpperCase() + (type || '').slice(1).replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                        <div className="grid grid-cols-2 gap-2">
                             <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                            <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {isLoading ? (
                             <p className="text-center text-secondary-500 py-8">Cargando asientos...</p>
                        ) : pagedData.items.length === 0 ? (
                            <p className="text-center text-secondary-500 py-8">No hay asientos que coincidan con los filtros.</p>
                        ) : (
                            pagedData.items.map(asiento => (
                                <div key={asiento.id} className="border rounded-lg overflow-hidden">
                                    <div className="bg-secondary-50 p-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{asiento.descripcion}</p>
                                            <p className="text-sm text-secondary-600">
                                                Fecha: {new Date(asiento.fecha + 'T00:00:00').toLocaleDateString('es-DO')} | Ref: {asiento.transaccionId} ({asiento.transaccionTipo})
                                            </p>
                                        </div>
                                    </div>
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-white">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-secondary-500">Cuenta</th>
                                                <th className="px-4 py-2 text-left font-medium text-secondary-500">Descripción</th>
                                                <th className="px-4 py-2 text-right font-medium text-secondary-500">Débito</th>
                                                <th className="px-4 py-2 text-right font-medium text-secondary-500">Crédito</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {asiento.entradas.map((e, index) => (
                                                <tr key={index} className="border-t">
                                                    <td className="px-4 py-2 font-mono">{e.cuentaId}</td>
                                                    <td className="px-4 py-2">{e.descripcion}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{e.debito > 0 ? formatCurrency(e.debito) : ''}</td>
                                                    <td className="px-4 py-2 text-right font-mono">{e.credito > 0 ? formatCurrency(e.credito) : ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-secondary-50 font-bold">
                                            <tr>
                                                <td colSpan={2} className="px-4 py-2 text-right">Totales</td>
                                                <td className="px-4 py-2 text-right font-mono border-t-2 border-secondary-300">
                                                    {formatCurrency(asiento.entradas.reduce((sum, e) => sum + e.debito, 0))}
                                                </td>
                                                <td className="px-4 py-2 text-right font-mono border-t-2 border-secondary-300">
                                                    {formatCurrency(asiento.entradas.reduce((sum, e) => sum + e.credito, 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            ))
                        )}
                    </div>
                     <Pagination
                        currentPage={currentPage}
                        totalCount={pagedData.totalCount}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={page => setCurrentPage(page)}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default LibroDiarioPage;
