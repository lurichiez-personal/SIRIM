import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FacturaRecurrente } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons';
import Pagination from '../../components/ui/Pagination';
import NuevaFacturaRecurrenteModal from './NuevaFacturaRecurrenteModal';
import { exportToCSV } from '../../utils/csvExport';

const ITEMS_PER_PAGE = 10;

const FacturacionRecurrentePage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { facturasRecurrentes, clientes, items, getPagedFacturasRecurrentes, addFacturaRecurrente, updateFacturaRecurrente, addCliente } = useDataStore();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [plantillaParaEditar, setPlantillaParaEditar] = useState<FacturaRecurrente | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos' as 'todos' | 'activa' | 'inactiva' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedFacturasRecurrentes({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedFacturasRecurrentes, facturasRecurrentes]);

    const handleFilterChange = (field: string, value: string) => {
        if (field === 'status') {
            setFilters(prev => ({ ...prev, status: value as 'todos' | 'activa' | 'inactiva' }));
        } else {
            setFilters(prev => ({ ...prev, [field]: value }));
        }
        setCurrentPage(1);
    };
    
    const handleOpenModalParaCrear = () => {
        setPlantillaParaEditar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (plantilla: FacturaRecurrente) => {
        setPlantillaParaEditar(plantilla);
        setIsModalOpen(true);
    };
    
    const handleSave = (data: Omit<FacturaRecurrente, 'id' | 'empresaId' | 'fechaProxima' | 'activa'> | FacturaRecurrente) => {
        if ('id' in data) {
            updateFacturaRecurrente(data);
        } else {
            addFacturaRecurrente(data);
        }
    };
    
    const handleGenerate = (plantilla: FacturaRecurrente) => {
        navigate('/facturas', { state: { facturaRecurrente: plantilla } });
    };
    
    const handleExport = () => {
        const dataToExport = getPagedFacturasRecurrentes({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(r => ({
            'Cliente': r.clienteNombre,
            'Descripcion': r.descripcion,
            'Frecuencia': r.frecuencia,
            'Fecha Proxima': r.fechaProxima,
            'Monto Total': r.montoTotal,
            'Estado': r.activa ? 'Activa' : 'Inactiva',
        })), 'facturacion_recurrente');
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    const isReadyToGenerate = (proximaFecha: string) => new Date(proximaFecha) <= new Date();

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Facturación Recurrente</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button leftIcon={<PlusIcon />} onClick={handleOpenModalParaCrear}>
                        Nueva Plantilla
                    </Button>
                </div>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Plantillas de Facturación</CardTitle>
                    <div className="mt-4 flex space-x-4">
                        <input
                            type="text"
                            placeholder="Buscar por cliente o descripción..."
                            className="w-full md:w-1/3 px-3 py-2 border border-secondary-300 rounded-md"
                            value={filters.searchTerm}
                            onChange={e => handleFilterChange('searchTerm', e.target.value)}
                        />
                        <select
                            className="px-3 py-2 border border-secondary-300 rounded-md"
                            value={filters.status}
                            onChange={e => handleFilterChange('status', e.target.value)}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="activa">Activa</option>
                            <option value="inactiva">Inactiva</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Frecuencia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Próxima Emisión</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                               {loading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay plantillas recurrentes.</td></tr>
                                ) : (pagedData.items.map(r => (
                                    <tr key={r.id}>
                                        <td className="px-6 py-4 font-medium">{r.clienteNombre}</td>
                                        <td className="px-6 py-4 capitalize">{r.frecuencia}</td>
                                        <td className="px-6 py-4">{new Date(r.fechaProxima + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-4 font-semibold">{formatCurrency(r.montoTotal)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${r.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {r.activa ? 'Activa' : 'Inactiva'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {isReadyToGenerate(r.fechaProxima) && r.activa && (
                                                <Button size="sm" onClick={() => handleGenerate(r)}>Generar Factura</Button>
                                            )}
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(r)}>Editar</Button>
                                        </td>
                                    </tr>
                                )))}
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

            <NuevaFacturaRecurrenteModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                clientes={clientes}
                itemsDisponibles={items}
                onCreateCliente={addCliente}
                plantillaParaEditar={plantillaParaEditar}
            />
        </div>
    );
};

export default FacturacionRecurrentePage;