import React, { useState, useEffect, useMemo } from 'react';
import { Ingreso, Factura, FacturaEstado, MetodoPago } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons.tsx';
import Pagination from '../../components/ui/Pagination.tsx';
import NuevoCobroModal from './NuevoPagoModal.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import { applyPagination } from '../../utils/pagination.ts';

const ITEMS_PER_PAGE = 10;

const CobrosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { ingresos, addIngreso, getFacturasParaPago, isLoading } = useDataStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '', metodoPago: 'todos' });
    const [facturasDisponibles, setFacturasDisponibles] = useState<Factura[]>([]);

    useEffect(() => {
        if (selectedTenant) {
            setFacturasDisponibles(getFacturasParaPago());
        }
    }, [selectedTenant, getFacturasParaPago, ingresos]); // Add ingresos to dependencies to refresh list

    const pagedData = useMemo(() => {
        let filtered = [...ingresos];

        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(i => i.clienteNombre?.toLowerCase().includes(lowerTerm));
        }
        if (filters.startDate) {
            filtered = filtered.filter(f => f.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(f => f.fecha <= filters.endDate);
        }
        if (filters.metodoPago && filters.metodoPago !== 'todos') {
            filtered = filtered.filter(i => i.metodoPago === filters.metodoPago);
        }
        
        const sorted = filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

        return applyPagination(sorted, currentPage, ITEMS_PER_PAGE);

    }, [ingresos, currentPage, filters]);


    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveCobro = (pagoData: Omit<Ingreso, 'id' | 'empresaId'>) => {
        addIngreso(pagoData);
    };

    const handleExport = () => {
        exportToCSV(pagedData.items.map(i => ({
            'Fecha': i.fecha,
            'Cliente': i.clienteNombre,
            'Monto': i.monto,
            'Metodo de Pago': i.metodoPago,
            'Factura Asociada ID': i.facturaId,
            'Notas': i.notas,
        })), 'cobros_recibidos');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Cobros</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button leftIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
                        Registrar Cobro
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Cobros Recibidos</CardTitle>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Buscar por cliente..." className="col-span-2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                        <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.metodoPago} onChange={e => handleFilterChange('metodoPago', e.target.value)}>
                            <option value="todos">Todos los métodos</option>
                            {Object.values(MetodoPago).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="col-span-1 grid grid-cols-2 gap-2">
                            <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                            <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Método de Pago</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Factura Asociada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Notas</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay cobros registrados.</td></tr>
                                ) : (
                                    pagedData.items.map(ingreso => (
                                        <tr key={ingreso.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{ingreso.clienteNombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(ingreso.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(ingreso.monto)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{ingreso.metodoPago}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                <span className="text-primary hover:underline cursor-pointer">#{ingreso.facturaId}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 truncate max-w-xs">{ingreso.notas || ''}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalCount={pagedData.totalCount}
                        pageSize={ITEMS_PER_PAGE}
                        onPageChange={page => setCurrentPage(page)}
                    />
                </CardContent>
            </Card>

            <NuevoCobroModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCobro}
                facturasDisponibles={facturasDisponibles}
            />
        </div>
    );
};

export default CobrosPage;