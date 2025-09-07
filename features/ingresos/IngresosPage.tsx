import React, { useState, useEffect } from 'react';
import { Ingreso, Factura, FacturaEstado, MetodoPago } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons';
import Pagination from '../../components/ui/Pagination';
import NuevoPagoModal from './NuevoPagoModal';
import { exportToCSV } from '../../utils/csvExport';
import BulkUploadModal from '../bulk-upload/BulkUploadModal';

const ITEMS_PER_PAGE = 10;

const IngresosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getPagedIngresos, addIngreso, getFacturasParaPago, facturas } = useDataStore();
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '', metodoPago: 'todos' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });
    const [facturasDisponibles, setFacturasDisponibles] = useState<Factura[]>([]);

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedIngresos({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setFacturasDisponibles(getFacturasParaPago());
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedIngresos, getFacturasParaPago, facturas]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSavePago = (pagoData: Omit<Ingreso, 'id' | 'empresaId'>) => {
        addIngreso(pagoData);
    };

    const handleExport = () => {
        const dataToExport = getPagedIngresos({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(i => ({
            'Fecha': i.fecha,
            'Cliente': i.clienteNombre,
            'Monto': i.monto,
            'Metodo de Pago': i.metodoPago,
            'Factura Asociada ID': i.facturaId,
            'Notas': i.notas,
        })), 'pagos_recibidos');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Pagos y Cobros</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button variant="secondary" onClick={() => setIsBulkUploadOpen(true)}>📊 Cargar Excel</Button>
                    <Button leftIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
                        Registrar Pago
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Historial de Pagos Recibidos</CardTitle>
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
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay pagos registrados para esta empresa.</td></tr>
                                ) : (
                                    pagedData.items.map(ingreso => (
                                        <tr key={ingreso.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{ingreso.clienteNombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(ingreso.fecha).toLocaleDateString('es-DO')}</td>
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

            <NuevoPagoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePago}
                facturasDisponibles={facturasDisponibles}
            />
            <BulkUploadModal isOpen={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} type="ingresos" empresaId={selectedTenant?.id || 0} onSuccess={() => {/* Refrescar datos */}} />
        </div>
    );
};

export default IngresosPage;