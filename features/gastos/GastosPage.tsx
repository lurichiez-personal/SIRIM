import React, { useState, useEffect } from 'react';
import { Gasto } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon, TrashIcon } from '../../components/icons/Icons';
import NuevoGastoModal from './NuevoGastoModal';
import { useDataStore } from '../../stores/useDataStore';
import VistaPreviaGastoModal from './VistaPreviaGastoModal';
import Pagination from '../../components/ui/Pagination';
import Checkbox from '../../components/ui/Checkbox';
import { exportToCSV } from '../../utils/csvExport';
import EscanearGastoModal from './EscanearGastoModal';
import ProcesarLoteFacturasModal from './ProcesarLoteFacturasModal';

const ITEMS_PER_PAGE = 10;
const GASTO_CATEGORIAS_606 = [
    '01 - GASTOS DE PERSONAL', '02 - GASTOS POR TRABAJOS, SUMINISTROS Y SERVICIOS', '03 - ARRENDAMIENTOS',
    '04 - GASTOS DE ACTIVOS FIJOS', '05 - GASTOS DE REPRESENTACIÓN', '06 - OTRAS DEDUCCIONES ADMITIDAS',
    '07 - GASTOS FINANCIEROS', '08 - GASTOS EXTRAORDINARIOS', '09 - COMPRAS Y GASTOS QUE FORMARAN PARTE DEL COSTO DE VENTA',
    '10 - ADQUISICIONES DE ACTIVOS', '11 - GASTOS DE SEGUROS',
];

const GastosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { gastos, getPagedGastos, addGasto, updateGasto, bulkDeleteGastos } = useDataStore(); 
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isScanModalOpen, setIsScanModalOpen] = useState(false);
    const [isLoteModalOpen, setIsLoteModalOpen] = useState(false);
    const [isVistaPreviaOpen, setIsVistaPreviaOpen] = useState(false);
    const [gastoParaEditar, setGastoParaEditar] = useState<Gasto | null>(null);
    const [gastoParaVer, setGastoParaVer] = useState<Gasto | null>(null);
    const [scannedData, setScannedData] = useState<Partial<Gasto> | null>(null);
    
    // State for filtering, pagination, and selection
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', category: 'todos' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedGastos({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setSelectedIds(new Set());
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedGastos, gastos]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveGasto = (gastoData: Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>) => {
        if (gastoParaEditar) {
            updateGasto({ ...gastoParaEditar, ...gastoData });
        } else {
            addGasto(gastoData);
        }
    };
    
    const handleScanComplete = (data: Partial<Gasto>) => {
        setScannedData(data);
        setIsScanModalOpen(false);
        setGastoParaEditar(null);
        setIsModalOpen(true);
    };

    const handleBatchComplete = (gastos: Partial<Gasto>[]) => {
        // Agregar todos los gastos válidos del lote
        gastos.forEach(gastoData => {
            if (gastoData.monto && gastoData.monto > 0) {
                addGasto(gastoData as Omit<Gasto, 'id' | 'empresaId' | 'conciliado'>);
            }
        });
        setIsLoteModalOpen(false);
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(pagedData.items.map(g => g.id)) : new Set());
    const handleSelectOne = (id: number, checked: boolean) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;

    const handleBulkDelete = () => {
        if (window.confirm(`¿Está seguro que desea eliminar ${selectedIds.size} gastos?`)) {
            bulkDeleteGastos(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleExport = () => {
        const dataToExport = getPagedGastos({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(g => ({
            'Fecha': g.fecha,
            'Proveedor': g.proveedorNombre,
            'RNC Proveedor': g.rncProveedor,
            'NCF': g.ncf,
            'Categoria': g.categoriaGasto,
            'Descripcion': g.descripcion,
            'Subtotal': g.subtotal,
            'ITBIS': g.itbis,
            'Monto Total': g.monto,
        })), 'gastos');
    };

  return (
    <div>
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-secondary-800">Gastos</h1>
            <div className="flex space-x-2">
                <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                <Button variant="secondary" onClick={() => setIsScanModalOpen(true)}>📷 Escanear Gasto</Button>
                <Button variant="secondary" onClick={() => setIsLoteModalOpen(true)}>📄 Lote PDF</Button>
                <Button leftIcon={<PlusIcon />} onClick={() => { setGastoParaEditar(null); setScannedData(null); setIsModalOpen(true); }}>
                    Registrar Gasto
                </Button>
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Listado de Gastos</CardTitle>
                <div className="mt-4 flex space-x-4">
                    <input type="text" placeholder="Buscar por proveedor, NCF, descripción..." className="w-full md:w-1/2 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
                    <select className="px-3 py-2 border border-secondary-300 rounded-md" value={filters.category} onChange={e => handleFilterChange('category', e.target.value)}>
                        <option value="todos">Todas las categorías</option>
                        {GASTO_CATEGORIAS_606.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </CardHeader>
            <CardContent>
                {selectedIds.size > 0 && (
                    <div className="bg-primary-50 p-3 rounded-md mb-4 flex items-center space-x-4">
                        <p className="text-sm font-semibold">{selectedIds.size} seleccionado(s)</p>
                        <Button size="sm" variant="danger" onClick={handleBulkDelete} leftIcon={<TrashIcon />}>Eliminar</Button>
                    </div>
                )}
               <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                        <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Categoría</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Proveedor</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">NCF</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                            {loading ? (
                                <tr><td colSpan={8} className="text-center py-4">Cargando...</td></tr>
                            ) : pagedData.items.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-4 text-secondary-500">No se encontraron gastos.</td></tr>
                            ): (
                                pagedData.items.map(gasto => (
                                    <tr key={gasto.id} className={`hover:bg-secondary-50 ${selectedIds.has(gasto.id) ? 'bg-primary-50' : ''}`}>
                                        <td className="px-6 py-4"><Checkbox checked={selectedIds.has(gasto.id)} onChange={(checked) => handleSelectOne(gasto.id, checked)} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-4">
                                            <button onClick={() => { setGastoParaVer(gasto); setIsVistaPreviaOpen(true); }} className="text-primary hover:text-primary-700">Ver</button>
                                            <button onClick={() => { setGastoParaEditar(gasto); setIsModalOpen(true); }} className="text-primary hover:text-primary-700">Editar</button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{gasto.categoriaGasto}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{gasto.proveedorNombre || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(gasto.fecha).toLocaleDateString('es-DO')}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(gasto.monto)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{gasto.ncf || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 truncate max-w-xs">{gasto.descripcion}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalCount={pagedData.totalCount} pageSize={ITEMS_PER_PAGE} onPageChange={page => setCurrentPage(page)} />
            </CardContent>
        </Card>

        <NuevoGastoModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveGasto} gastoParaEditar={gastoParaEditar} initialData={scannedData} />
        <VistaPreviaGastoModal isOpen={isVistaPreviaOpen} onClose={() => setIsVistaPreviaOpen(false)} gasto={gastoParaVer} />
        <EscanearGastoModal isOpen={isScanModalOpen} onClose={() => setIsScanModalOpen(false)} onScanComplete={handleScanComplete} />
        <ProcesarLoteFacturasModal isOpen={isLoteModalOpen} onClose={() => setIsLoteModalOpen(false)} onBatchComplete={handleBatchComplete} />
    </div>
  );
};

export default GastosPage;