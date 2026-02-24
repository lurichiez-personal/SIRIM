
// src/features/facturas/FacturasPage.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Factura, FacturaEstado, Permission, Cliente, Item, Cotizacion, FacturaRecurrente, MetodoPago, NCFType, Ingreso } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon, TrashIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon, EyeIcon, UploadIcon, InformationCircleIcon, BanknotesIcon } from '../../components/icons/Icons.tsx';
import NuevaFacturaModal from './NuevaFacturaModal.tsx';
import NuevoCobroModal from '../ingresos/NuevoPagoModal.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import Pagination from '../../components/ui/Pagination.tsx';
import Checkbox from '../../components/ui/Checkbox.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import Can from '../../components/Can.tsx';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';
import { applyPagination } from '../../utils/pagination.ts';
import VistaPreviaFacturaModal from './VistaPreviaFacturaModal.tsx';
import { formatCurrency } from '../../utils/formatters.ts';
import { useNCFStore } from '../../stores/useNCFStore.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import { DatePreset, getDateRange } from '../../utils/dateUtils.ts';
import { useTaskStore } from '../../stores/useTaskStore.ts';
import IncompleteNotesModal from './IncompleteNotesModal.tsx';

const ITEMS_PER_PAGE = 10;
type SortField = keyof Factura;

const FacturasPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { facturas, ingresos, clientes, items, addFactura, updateFactura, addCliente, deleteFactura, bulkDeleteFacturas, bulkUpdateFacturaStatus, importFacturasFromExcel, isLoading, addIngreso } = useDataStore();
    const { getNextNCF, sequences } = useNCFStore();
    const { showConfirmation } = useConfirmationStore();
    const { showAlert } = useAlertStore();
    const { addTask, updateTaskProgress, completeTask, failTask } = useTaskStore();
    const navigate = useNavigate();
    const location = useLocation();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [isCobroModalOpen, setIsCobroModalOpen] = useState(false);
    const [isIncompleteNotesModalOpen, setIsIncompleteNotesModalOpen] = useState(false);
    
    const [facturaParaEditar, setFacturaParaEditar] = useState<Factura | null>(null);
    const [facturaParaVer, setFacturaParaVer] = useState<Factura | null>(null);
    const [facturaParaCobrar, setFacturaParaCobrar] = useState<Factura | null>(null);
    const [cotizacionParaFacturar, setCotizacionParaFacturar] = useState<Cotizacion | null>(null);
    const [facturaRecurrenteParaFacturar, setFacturaRecurrenteParaFacturar] = useState<FacturaRecurrente | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', status: 'todos', startDate: '', endDate: '' });
    const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
    const [sortConfig, setSortConfig] = useState<{ field: SortField, direction: 'asc' | 'desc' } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (location.state?.cotizacion) {
            setCotizacionParaFacturar(location.state.cotizacion);
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true });
        }
        if (location.state?.facturaRecurrente) {
            setFacturaRecurrenteParaFacturar(location.state.facturaRecurrente);
            setIsModalOpen(true);
            navigate(location.pathname, { replace: true });
        }
    }, [location.state, navigate]);
    
    useEffect(() => {
        const range = getDateRange(datePreset);
        setFilters(prev => ({ ...prev, startDate: range.start, endDate: range.end }));
    }, [datePreset]);

    const pagedData = useMemo(() => {
        let filtered = [...facturas];

        if (filters.searchTerm) {
            const lowerTerm = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(f => f.clienteNombre.toLowerCase().includes(lowerTerm) || f.ncf?.toLowerCase().includes(lowerTerm));
        }
        if (filters.status !== 'todos') {
            filtered = filtered.filter(f => f.estado === filters.status);
        }
        if (filters.startDate) {
            filtered = filtered.filter(f => f.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(f => f.fecha <= filters.endDate);
        }

        if (sortConfig) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.field];
                const bValue = b[sortConfig.field];
                if (aValue === undefined || aValue === null) return 1;
                if (bValue === undefined || bValue === null) return -1;
                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        } else {
             filtered.sort((a, b) => new Date(b.fecha).getTime() - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        }

        return applyPagination(filtered, currentPage, ITEMS_PER_PAGE);
    }, [facturas, currentPage, filters, sortConfig]);

    const incompleteNotes = useMemo(() => {
        return facturas.filter(f => 
            (f.ncf?.startsWith('B04') || f.ncf?.startsWith('E34')) && 
            (!f.ncfModificado || f.ncfModificado.trim() === '')
        );
    }, [facturas]);
    
    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSort = (field: SortField) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ field, direction });
    };

    const getSortIcon = (field: SortField) => {
        if (!sortConfig || sortConfig.field !== field) return <ChevronUpDownIcon className="h-4 w-4 ml-2 text-secondary-400" />;
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-2" /> : <ChevronDownIcon className="h-4 w-4 ml-2" />;
    };

    const handleOpenModalParaCrear = () => {
        setFacturaParaEditar(null);
        setCotizacionParaFacturar(null);
        setFacturaRecurrenteParaFacturar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (factura: Factura) => {
        setFacturaParaEditar(factura);
        setCotizacionParaFacturar(null);
        setFacturaRecurrenteParaFacturar(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setFacturaParaEditar(null);
        setCotizacionParaFacturar(null);
        setFacturaRecurrenteParaFacturar(null);
    };
    
    const handleOpenCobroModal = (factura: Factura) => {
        setFacturaParaCobrar(factura);
        setIsCobroModalOpen(true);
    }
    
    const handleSaveCobro = (pagoData: Omit<Ingreso, 'id' | 'empresaId'>) => {
        addIngreso(pagoData);
        setIsCobroModalOpen(false);
        setFacturaParaCobrar(null);
    };

    const handleSaveFactura = async (facturaData: any) => {
        if (!selectedTenant) return;
        try {
            if (facturaParaEditar) {
                await updateFactura({ ...facturaParaEditar, ...facturaData });
            } else {
                let ncfToUse = facturaData.ncf;
                
                // Si el usuario dejó el campo vacío o si el NCF proporcionado coincide con el siguiente de la secuencia,
                // llamamos a getNextNCF para asegurar que se consuma/incremente la secuencia en la BD.
                if (!ncfToUse) {
                     const generatedNcf = await getNextNCF(selectedTenant.id, facturaData.ncfTipo);
                     if (!generatedNcf) {
                        showAlert('Error de NCF', `No hay secuencias de NCF disponibles para el tipo ${facturaData.ncfTipo}.`);
                        throw new Error("No NCF available");
                     }
                     ncfToUse = generatedNcf;
                } else {
                    // Si el usuario proporcionó un NCF manualmente, verificamos si es el que "toca".
                    // Si es el que toca, llamamos a getNextNCF para "quemarlo" en la secuencia.
                    // Si no es el que toca (es uno viejo o futuro manual), lo usamos tal cual sin mover la secuencia.
                    
                    const activeSeq = sequences.find(s => s.tipo === facturaData.ncfTipo && s.empresaId === selectedTenant.id && s.activa);
                    if (activeSeq) {
                        let ncfLength = 8;
                        if (activeSeq.prefijo.startsWith('B')) ncfLength = 11 - activeSeq.prefijo.length;
                        else if (activeSeq.prefijo.startsWith('E')) ncfLength = 13 - activeSeq.prefijo.length;
                        const expectedNext = activeSeq.prefijo + String(activeSeq.secuenciaActual).padStart(ncfLength, '0');
                        
                        if (ncfToUse === expectedNext) {
                            // Coincide, consumimos la secuencia oficialmente
                            await getNextNCF(selectedTenant.id, facturaData.ncfTipo); 
                        }
                    }
                }

                await addFactura({ ...facturaData, ncf: ncfToUse });
            }
        } catch (error) {
            console.error("Failed to save invoice:", error);
            throw error;
        }
    };
    
    const handleDeleteFactura = (factura: Factura) => {
        showConfirmation('Confirmar Eliminación', `¿Está seguro de que desea eliminar la factura ${factura.ncf}?`,
            () => deleteFactura(factura.id)
        );
    };

    const handleBulkDelete = () => {
        showConfirmation('Confirmar Eliminación Masiva', `¿Está seguro de que desea eliminar ${selectedIds.size} facturas?`,
            () => {
                bulkDeleteFacturas(Array.from(selectedIds));
                setSelectedIds(new Set());
            }
        );
    };
    
    const handleBulkStatusChange = (status: FacturaEstado) => {
        bulkUpdateFacturaStatus(Array.from(selectedIds), status);
        setSelectedIds(new Set());
    };
    
    const handleExport = () => {
        exportToCSV(pagedData.items.map(f => ({
            'NCF': f.ncf, 'Cliente': f.clienteNombre, 'Fecha': f.fecha, 'Monto Total': f.montoTotal,
            'ITBIS Retenido': f.itbisRetenido, 'Monto Pagado': f.montoPagado, 'Estado': f.estado,
        })), 'facturas');
    };

    const handleImportExcel = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const taskId = `import-facturas-${Date.now()}`;
        addTask(taskId, `Importando facturas desde Excel...`);

        try {
            const result = await importFacturasFromExcel(file, (progress) => {
                updateTaskProgress(taskId, progress);
            });
            completeTask(taskId, result.message);
            
            // Check for incomplete notes after a brief delay to allow local state update if needed
            // though useDataStore already updates.
            setTimeout(() => {
                const pending = facturas.filter(f => 
                    (f.ncf?.startsWith('B04') || f.ncf?.startsWith('E34')) && 
                    (!f.ncfModificado || f.ncfModificado.trim() === '')
                );
                if (pending.length > 0) {
                    setIsIncompleteNotesModalOpen(true);
                }
            }, 1000);

        } catch (error) {
            failTask(taskId, error instanceof Error ? error.message : 'Error al importar.');
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    
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

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(pagedData.items.map(c => c.id)) : new Set());
    const handleSelectOne = (id: string, checked: boolean) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;
    
    const handleVerFactura = (factura: Factura) => {
        setFacturaParaVer(factura);
        setIsVistaPreviaOpen(true);
    };

    const SortableHeader: React.FC<{ field: SortField, title: string }> = ({ field, title }) => (
        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100" onClick={() => handleSort(field)}>
            <div className="flex items-center">{title}{getSortIcon(field)}</div>
        </th>
    );

    const getFormaPago = (facturaId: string) => {
        const pagos = ingresos.filter(i => i.facturaId === facturaId);
        if (pagos.length === 0) return <span className="text-secondary-400 italic">Venta a Crédito</span>;
        if (pagos.length === 1) return <span className="text-secondary-600">{pagos[0].metodoPago.substring(3)}</span>;
        return <span className="text-primary-600 font-semibold">Múltiples Formas</span>;
    };

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-secondary-800">Facturación</h1>
                <div className="flex space-x-2 w-full md:w-auto">
                    <Button variant="secondary" leftIcon={<DownloadIcon/>} onClick={handleExport} className="flex-1 md:flex-none">Exportar</Button>
                    <Button variant="secondary" leftIcon={<UploadIcon/>} onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none">Excel</Button>
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} className="hidden" accept=".xlsx, .xls" />
                    <Button leftIcon={<PlusIcon/>} onClick={handleOpenModalParaCrear} className="flex-1 md:flex-none">Nueva Factura</Button>
                </div>
            </div>

            {incompleteNotes.length > 0 && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <InformationCircleIcon className="h-6 w-6 text-red-500 mr-3" />
                            <div>
                                <p className="text-sm font-bold text-red-800 uppercase tracking-tight">Acción Requerida</p>
                                <p className="text-xs text-red-700">Se han detectado <span className="font-black underline">{incompleteNotes.length} Notas de Crédito</span> que no tienen el NCF de la factura original que modifican.</p>
                            </div>
                        </div>
                        <Button size="sm" variant="danger" onClick={() => setIsIncompleteNotesModalOpen(true)}>
                            Corregir Ahora
                        </Button>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Facturas</CardTitle>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input type="text" placeholder="Buscar por cliente o NCF..." className="md:col-span-2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                        <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.status} onChange={e => handleFilterChange('status', e.target.value)}>
                            <option value="todos">Todos los estados</option>
                            {Object.values(FacturaEstado).map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                        </select>
                         <select className="px-3 py-2 border border-secondary-300 rounded-md" value={datePreset} onChange={e => setDatePreset(e.target.value as DatePreset)}>
                            <option value="this_month">Este Mes</option>
                            <option value="last_month">Mes Pasado</option>
                            <option value="this_quarter">Este Trimestre</option>
                            <option value="this_year">Este Año</option>
                            <option value="all">Siempre</option>
                            <option value="custom">Rango Personalizado</option>
                        </select>
                    </div>
                    {datePreset === 'custom' && (
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
                            <div className="md:col-start-3 flex items-center space-x-2">
                                <label htmlFor="startDate" className="text-xs font-bold text-secondary-500 uppercase flex-shrink-0">Desde:</label>
                                <input type="date" id="startDate" className="w-full px-3 py-1.5 border border-secondary-300 rounded-md text-sm" value={filters.startDate} onChange={e => handleFilterChange('startDate', e.target.value)} />
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="endDate" className="text-xs font-bold text-secondary-500 uppercase flex-shrink-0">Hasta:</label>
                                <input type="date" id="endDate" className="w-full px-3 py-1.5 border border-secondary-300 rounded-md text-sm" value={filters.endDate} onChange={e => handleFilterChange('endDate', e.target.value)} />
                            </div>
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {selectedIds.size > 0 && (
                        <div className="bg-primary-50 p-3 rounded-md mb-4 flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                            <p className="text-sm font-semibold">{selectedIds.size} seleccionada(s)</p>
                            <div className="flex space-x-2">
                                <Button size="sm" onClick={() => handleBulkStatusChange(FacturaEstado.Anulada)}>Anular</Button>
                                <Can I={Permission.ELIMINAR_FACTURAS}><Button size="sm" variant="danger" onClick={handleBulkDelete} leftIcon={<TrashIcon />}>Eliminar</Button></Can>
                            </div>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                    <SortableHeader field="ncf" title="NCF" />
                                    <th className="px-6 py-3 text-left text-xs font-medium text-primary-600 uppercase tracking-wider">Modifica a</th>
                                    <SortableHeader field="clienteNombre" title="Cliente" />
                                    <SortableHeader field="fecha" title="Fecha" />
                                    <SortableHeader field="montoTotal" title="Monto" />
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">ITBIS Ret.</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Forma de Pago</th>
                                    <SortableHeader field="estado" title="Estado" />
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {isLoading ? (
                                    <tr><td colSpan={10} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={10} className="text-center py-4 text-secondary-500">No hay facturas que coincidan con los filtros.</td></tr>
                                ) : ( pagedData.items.map(factura => (
                                    <tr key={factura.id} className={`hover:bg-secondary-50 ${selectedIds.has(factura.id) ? 'bg-primary-50' : ''}`}>
                                        <td className="px-6 py-4"><Checkbox checked={selectedIds.has(factura.id)} onChange={(checked) => handleSelectOne(factura.id, checked)} /></td>
                                        <td className="px-6 py-4 font-mono font-bold text-sm">
                                            {factura.ncf}
                                            {(factura.ncf?.startsWith('B04') || factura.ncf?.startsWith('E34')) && <span className="ml-2 bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded font-black">N.C.</span>}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-mono text-primary-600 font-medium">
                                            {factura.ncfModificado || (factura as any).facturaAfectadaNCF || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm">{factura.clienteNombre}</td>
                                        <td className="px-6 py-4 text-sm">{new Date(factura.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-4 text-right text-sm font-semibold">{formatCurrency(factura.montoTotal)}</td>
                                        <td className="px-6 py-4 text-right text-sm text-red-600">{factura.itbisRetenido > 0 ? formatCurrency(factura.itbisRetenido) : '-'}</td>
                                        <td className="px-6 py-4 text-sm">{getFormaPago(factura.id)}</td>
                                        <td className="px-6 py-4"><span className={`px-2 inline-flex text-[10px] leading-5 font-bold uppercase rounded-full ${getStatusBadge(factura.estado)}`}>{factura.estado}</span></td>
                                        <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                                            <div className="flex items-center justify-end space-x-3">
                                                {factura.estado !== FacturaEstado.Pagada && factura.estado !== FacturaEstado.Anulada && (
                                                    <button onClick={() => handleOpenCobroModal(factura)} className="text-green-600 hover:text-green-800" title="Registrar Cobro">
                                                        <BanknotesIcon className="h-5 w-5"/>
                                                    </button>
                                                )}
                                                <button onClick={() => handleVerFactura(factura)} className="text-secondary-500 hover:text-primary" title="Ver Factura"><EyeIcon className="h-5 w-5"/></button>
                                                <button onClick={() => handleOpenModalParaEditar(factura)} className="text-primary hover:text-primary-700">Editar</button>
                                                <Can I={Permission.ELIMINAR_FACTURAS}><button onClick={() => handleDeleteFactura(factura)} className="text-red-600 hover:text-red-800" title="Eliminar"><TrashIcon className="h-5 w-5" /></button></Can>
                                            </div>
                                        </td>
                                    </tr>
                                )))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination currentPage={currentPage} totalCount={pagedData.totalCount} pageSize={ITEMS_PER_PAGE} onPageChange={page => setCurrentPage(page)} />
                </CardContent>
            </Card>

            <NuevaFacturaModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveFactura}
                clientes={clientes}
                itemsDisponibles={items}
                facturas={facturas}
                onCreateCliente={addCliente}
                facturaParaEditar={facturaParaEditar}
                cotizacionParaFacturar={cotizacionParaFacturar}
                facturaRecurrenteParaFacturar={facturaRecurrenteParaFacturar}
            />
            <VistaPreviaFacturaModal
                isOpen={isVistaPreviaOpen}
                onClose={() => setIsVistaPreviaOpen(false)}
                factura={facturaParaVer}
            />
            
            {/* Modal de Cobro Integrado */}
            <NuevoCobroModal
                isOpen={isCobroModalOpen}
                onClose={() => { setIsCobroModalOpen(false); setFacturaParaCobrar(null); }}
                onSave={handleSaveCobro}
                // Filter updated to include invoices that are Overdue (Vencida) but not Annulled or fully Paid.
                facturasDisponibles={facturas.filter(f => f.estado !== FacturaEstado.Anulada && f.estado !== FacturaEstado.Pagada)}
                initialFacturaId={facturaParaCobrar?.id}
            />
            
            {incompleteNotes.length > 0 && (
                <IncompleteNotesModal
                    isOpen={isIncompleteNotesModalOpen}
                    onClose={() => setIsIncompleteNotesModalOpen(false)}
                    notes={incompleteNotes}
                />
            )}
        </div>
    );
};

export default FacturasPage;
