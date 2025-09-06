import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Factura, FacturaEstado, Cliente, Cotizacion, CotizacionEstado, NotaType, CodigoModificacionNCF, NCFType, NotaCreditoDebito, FacturaRecurrente, Ingreso } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons';
import NuevaFacturaModal from './NuevaFacturaModal';
import { useNCFStore } from '../../stores/useNCFStore';
import { useDataStore } from '../../stores/useDataStore';
import VistaPreviaFacturaModal from './VistaPreviaFacturaModal';
import NuevaNotaModal from '../notas/NuevaNotaModal';
import NuevoPagoModal from '../ingresos/NuevoPagoModal';
import Pagination from '../../components/ui/Pagination';
import Checkbox from '../../components/ui/Checkbox';
import { exportToCSV } from '../../utils/csvExport';

const ITEMS_PER_PAGE = 10;

const FacturasPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getNextNCF } = useNCFStore();
    const { facturas, clientes, items, addFactura, updateFactura, addCliente, updateCotizacionStatus, addNota, updateFacturaStatus, getPagedFacturas, bulkUpdateFacturaStatus, addIngreso, getFacturasParaPago } = useDataStore();
    
    const location = useLocation();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [isFacturaModalOpen, setIsFacturaModalOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [isNotaModalOpen, setIsNotaModalOpen] = useState(false);
    const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
    const [facturaParaPago, setFacturaParaPago] = useState<Factura | null>(null);
    
    const [cotizacionParaFacturar, setCotizacionParaFacturar] = useState<Cotizacion | null>(null);
    const [facturaRecurrenteParaFacturar, setFacturaRecurrenteParaFacturar] = useState<FacturaRecurrente | null>(null);
    const [facturaParaEditar, setFacturaParaEditar] = useState<Factura | null>(null);
    const [facturaParaVer, setFacturaParaVer] = useState<Factura | null>(null);
    const [facturaParaNota, setFacturaParaNota] = useState<Factura | null>(null);

    // State for filtering, pagination, and selection
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos', startDate: '', endDate: '' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    
    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedFacturas({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setSelectedIds(new Set());
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedFacturas, facturas]);

    useEffect(() => {
        const { cotizacion, facturaRecurrente } = location.state || {};
        if (cotizacion) {
            setCotizacionParaFacturar(cotizacion);
            setIsFacturaModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
        if (facturaRecurrente) {
            setFacturaRecurrenteParaFacturar(facturaRecurrente);
            setIsFacturaModalOpen(true);
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, navigate, location.pathname]);
    
    const handleOpenModalParaCrear = () => {
        setFacturaParaEditar(null);
        setCotizacionParaFacturar(null);
        setFacturaRecurrenteParaFacturar(null);
        setIsFacturaModalOpen(true);
    };

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveFactura = async (facturaData: Omit<Factura, 'id' | 'empresaId' | 'estado' | 'ncf' | 'montoPagado'> & { ncfTipo: any }) => {
        if (!selectedTenant) return;
        const { ncfTipo, ...restOfData } = facturaData;

        if (facturaParaEditar) {
            updateFactura({ ...facturaParaEditar, ...restOfData });
        } else {
            const ncf = await getNextNCF(selectedTenant.id, ncfTipo);
            if (!ncf) {
                alert('Error: No hay NCF disponibles para el tipo seleccionado.');
                return;
            }
            addFactura({ ...restOfData, ncf, estado: FacturaEstado.Emitida, montoPagado: 0 });
            if (restOfData.cotizacionId) {
                updateCotizacionStatus(restOfData.cotizacionId, CotizacionEstado.Facturada);
            }
        }
    };

    const handleSaveNota = async (data: any) => {
        if (!selectedTenant) return;
        
        const { facturaAfectada, codigoModificacion, ...rest } = data;

        const ncf = await getNextNCF(selectedTenant.id, NCFType.B04);
        if (!ncf) {
            alert('Error: No hay NCF de tipo Nota de Crédito (B04) disponibles.');
            return;
        }

        const newNota: Omit<NotaCreditoDebito, 'id' | 'empresaId'> = {
            ...rest,
            tipo: NotaType.Credito,
            facturaAfectadaId: facturaAfectada.id,
            facturaAfectadaNCF: facturaAfectada.ncf || 'N/A',
            ncf,
            clienteId: facturaAfectada.clienteId,
            clienteNombre: facturaAfectada.clienteNombre,
            codigoModificacion,
        };
        
        addNota(newNota);

        if (codigoModificacion === '01') {
            updateFacturaStatus(facturaAfectada.id, FacturaEstado.Anulada);
        }
    };
    const handleCreateCliente = (newClientData: { nombre: string; rnc?: string, estadoDGII?: string }): Cliente => addCliente(newClientData);

    const handleRecibirPago = (factura: Factura) => {
        setFacturaParaPago(factura);
        setIsPagoModalOpen(true);
    };

    const handleSavePago = (pagoData: Omit<Ingreso, 'id' | 'empresaId' | 'conciliado'>) => {
        addIngreso(pagoData);
        setIsPagoModalOpen(false);
        setFacturaParaPago(null);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const getStatusBadge = (estado: FacturaEstado) => {
        const map = {
            [FacturaEstado.Pagada]: 'bg-green-100 text-green-800',
            [FacturaEstado.Emitida]: 'bg-blue-100 text-blue-800',
            [FacturaEstado.PagadaParcialmente]: 'bg-yellow-100 text-yellow-800',
            [FacturaEstado.Vencida]: 'bg-red-100 text-red-800',
            [FacturaEstado.Anulada]: 'bg-gray-400 text-white',
        };
        return map[estado] || 'bg-secondary-100 text-secondary-800';
    };

    const getStatusText = (estado: FacturaEstado) => estado.charAt(0).toUpperCase() + estado.slice(1);
    
    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(pagedData.items.map(f => f.id)) : new Set());
    const handleSelectOne = (id: number, checked: boolean) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;
    
    const handleBulkAction = (status: FacturaEstado) => {
        bulkUpdateFacturaStatus(Array.from(selectedIds), status);
        setSelectedIds(new Set());
    };

    const handleExport = () => {
        const dataToExport = getPagedFacturas({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(f => ({
            'NCF': f.ncf,
            'Cliente': f.clienteNombre,
            'Fecha': f.fecha,
            'Estado': f.estado,
            'Monto Total': f.montoTotal,
            'Monto Pagado': f.montoPagado,
        })), 'facturas');
    }

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-secondary-800">Facturación</h1>
             <div className="flex space-x-2">
                <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                <Button leftIcon={<PlusIcon />} onClick={handleOpenModalParaCrear}>Nueva Factura</Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Listado de Facturas</CardTitle>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <input type="text" placeholder="Buscar por cliente o NCF..." className="col-span-2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                    <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                        <option value="todos">Todos los estados</option>
                        {Object.values(FacturaEstado).map(s => <option key={s} value={s}>{getStatusText(s)}</option>)}
                    </select>
                     <div className="col-span-1 grid grid-cols-2 gap-2">
                        <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                        <input type="date" className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {selectedIds.size > 0 && (
                    <div className="bg-primary-50 p-3 rounded-md mb-4 flex items-center space-x-4">
                        <p className="text-sm font-semibold">{selectedIds.size} seleccionada(s)</p>
                        <Button size="sm" onClick={() => handleBulkAction(FacturaEstado.Pagada)}>Marcar como Pagada</Button>
                        <Button size="sm" onClick={() => handleBulkAction(FacturaEstado.Anulada)} variant="danger">Anular</Button>
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto Total</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">NCF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {loading ? (
                                <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
                            ) : pagedData.items.length === 0 ? (
                                <tr><td colSpan={7} className="text-center py-4 text-secondary-500">No hay facturas que coincidan con los filtros.</td></tr>
                            ) : (
                                pagedData.items.map(factura => (
                                    <tr key={factura.id} className={`hover:bg-secondary-50 ${selectedIds.has(factura.id) ? 'bg-primary-50' : ''}`}>
                                        <td className="px-6 py-4"><Checkbox checked={selectedIds.has(factura.id)} onChange={(checked) => handleSelectOne(factura.id, checked)} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{factura.clienteNombre}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(factura.fecha).toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">{formatCurrency(factura.montoTotal)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">{factura.ncf}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(factura.estado)}`}>
                                                {getStatusText(factura.estado)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <Button size="sm" variant="secondary" onClick={() => { setFacturaParaVer(factura); setIsVistaPreviaOpen(true); }}>Ver</Button>
                                            {(factura.estado === FacturaEstado.Emitida || factura.estado === FacturaEstado.PagadaParcialmente) && (
                                                <Button size="sm" variant="primary" onClick={() => handleRecibirPago(factura)}>Recibir Pago</Button>
                                            )}
                                            <Button size="sm" variant="secondary" onClick={() => { setFacturaParaNota(factura); setIsNotaModalOpen(true); }}>Nota de Crédito</Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalCount={pagedData.totalCount} pageSize={ITEMS_PER_PAGE} onPageChange={page => setCurrentPage(page)} />
            </CardContent>
        </Card>

        <NuevaFacturaModal 
            isOpen={isFacturaModalOpen}
            onClose={() => setIsFacturaModalOpen(false)}
            onSave={handleSaveFactura}
            clientes={clientes}
            itemsDisponibles={items}
            onCreateCliente={handleCreateCliente}
            cotizacionParaFacturar={cotizacionParaFacturar}
            facturaRecurrenteParaFacturar={facturaRecurrenteParaFacturar}
            facturaParaEditar={facturaParaEditar}
        />
        <VistaPreviaFacturaModal
            isOpen={isVistaPreviaOpen}
            onClose={() => setIsVistaPreviaOpen(false)}
            factura={facturaParaVer}
        />
        <NuevaNotaModal
            isOpen={isNotaModalOpen}
            onClose={() => setIsNotaModalOpen(false)}
            onSave={handleSaveNota}
            facturasDisponibles={facturas.filter(f => f.estado !== FacturaEstado.Anulada)}
            facturaAfectadaInicial={facturaParaNota}
        />
        
        {facturaParaPago && (
            <NuevoPagoModal
                isOpen={isPagoModalOpen}
                onClose={() => { setIsPagoModalOpen(false); setFacturaParaPago(null); }}
                onSave={handleSavePago}
                facturasDisponibles={[facturaParaPago]}
            />
        )}
    </div>
  );
};

export default FacturasPage;