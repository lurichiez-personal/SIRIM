import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Cotizacion, CotizacionEstado, Cliente, Item } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons.tsx';
import NuevaCotizacionModal from './NuevaCotizacionModal.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import VistaPreviaCotizacionModal from './VistaPreviaCotizacionModal.tsx';
import Pagination from '../../components/ui/Pagination.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import { applyPagination } from '../../utils/pagination.ts';

const ITEMS_PER_PAGE = 10;

const CotizacionesPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { cotizaciones, clientes, items, addCotizacion, updateCotizacion, addCliente, isLoading } = useDataStore();
    const navigate = useNavigate();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [cotizacionParaEditar, setCotizacionParaEditar] = useState<Cotizacion | null>(null);
    const [cotizacionParaVer, setCotizacionParaVer] = useState<Cotizacion | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos', startDate: '', endDate: '' });
    
    const pagedData = useMemo(() => {
        let filtered = [...cotizaciones];
        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(c => c.clienteNombre.toLowerCase().includes(lowerTerm) || c.id.toString().includes(lowerTerm));
        }
        if (filters.status && filters.status !== 'todos') {
            filtered = filtered.filter(c => c.estado === filters.status);
        }
        if (filters.startDate) {
            filtered = filtered.filter(c => c.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(c => c.fecha <= filters.endDate);
        }
        const sorted = filtered.sort((a,b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
        return applyPagination(sorted, currentPage, ITEMS_PER_PAGE);
    }, [cotizaciones, currentPage, filters]);
    
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleOpenModalParaCrear = () => {
        setCotizacionParaEditar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (cotizacion: Cotizacion) => {
        setCotizacionParaEditar(cotizacion);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setCotizacionParaEditar(null);
    };
    
    const handleVerCotizacion = (cotizacion: Cotizacion) => {
        setCotizacionParaVer(cotizacion);
        setIsVistaPreviaOpen(true);
    };

    const handleSaveCotizacion = async (cotizacionData: Omit<Cotizacion, 'id' | 'empresaId' | 'estado'>) => {
        try {
            if (cotizacionParaEditar) {
                await updateCotizacion({ ...cotizacionParaEditar, ...cotizacionData });
            } else {
                await addCotizacion(cotizacionData);
            }
        } catch (error) {
            console.error("Failed to save quote:", error);
            throw error;
        }
    };

    const handleCreateCliente = async (newClientData: { nombre: string; rnc?: string }): Promise<Cliente> => {
        return await addCliente({ ...newClientData, activo: true });
    };

    const handleConvertirAFactura = (cotizacion: Cotizacion) => {
        navigate('/dashboard/facturas', { state: { cotizacion } });
    };

    const handleExport = () => {
        exportToCSV(pagedData.items.map(c => ({
            'ID Cotizacion': c.id,
            'Cliente': c.clienteNombre,
            'RNC Cliente': c.clienteRNC,
            'Fecha': c.fecha,
            'Estado': c.estado,
            'Monto Total': c.montoTotal,
        })), 'cotizaciones');
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const getStatusBadge = (estado: CotizacionEstado) => {
        const statuses: { [key in CotizacionEstado]: string } = {
            [CotizacionEstado.Pendiente]: 'bg-yellow-100 text-yellow-800',
            [CotizacionEstado.Aprobada]: 'bg-blue-100 text-blue-800',
            [CotizacionEstado.Facturada]: 'bg-green-100 text-green-800',
            [CotizacionEstado.Rechazada]: 'bg-red-100 text-red-800',
            [CotizacionEstado.Anulada]: 'bg-gray-400 text-white',
        };
        return statuses[estado] || 'bg-secondary-100 text-secondary-800';
    };

    const getStatusText = (estado: CotizacionEstado) => {
        return estado.charAt(0).toUpperCase() + estado.slice(1);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Cotizaciones</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button leftIcon={<PlusIcon />} onClick={handleOpenModalParaCrear}>
                        Nueva Cotización
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Cotizaciones</CardTitle>
                     <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Buscar por cliente o ID..." className="col-span-2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                        <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                            <option value="todos">Todos los estados</option>
                            {Object.values(CotizacionEstado).map(s => <option key={s} value={s}>{getStatusText(s)}</option>)}
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider"># Cotización</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No se encontraron cotizaciones.</td></tr>
                                ) : (
                                    pagedData.items.map(cot => (
                                        <tr key={cot.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{cot.id}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{cot.clienteNombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(cot.fecha).toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(cot.montoTotal)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(cot.estado)}`}>
                                                    {getStatusText(cot.estado)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                                                <button onClick={() => handleVerCotizacion(cot)} className="text-primary hover:text-primary-700">Ver</button>
                                                {cot.estado === CotizacionEstado.Pendiente && (
                                                    <>
                                                        <button onClick={() => handleOpenModalParaEditar(cot)} className="text-primary hover:text-primary-700">Editar</button>
                                                        <Button variant="secondary" size="sm" onClick={() => handleConvertirAFactura(cot)}>Convertir a Factura</Button>
                                                    </>
                                                )}
                                            </td>
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

            <NuevaCotizacionModal 
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveCotizacion}
                clientes={clientes}
                itemsDisponibles={items}
                onCreateCliente={handleCreateCliente}
                cotizacionParaEditar={cotizacionParaEditar}
            />

            <VistaPreviaCotizacionModal
                isOpen={isVistaPreviaOpen}
                onClose={() => setIsVistaPreviaOpen(false)}
                cotizacion={cotizacionParaVer}
            />
        </div>
    );
};

export default CotizacionesPage;