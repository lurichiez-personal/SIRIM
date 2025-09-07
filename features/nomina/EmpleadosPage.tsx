import React, { useState, useEffect } from 'react';
import { Empleado } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon, TrashIcon } from '../../components/icons/Icons';
import { useDataStore } from '../../stores/useDataStore';
import Pagination from '../../components/ui/Pagination';
import Checkbox from '../../components/ui/Checkbox';
import { exportToCSV } from '../../utils/csvExport';
import BulkUploadModal from '../bulk-upload/BulkUploadModal';
import NuevoEmpleadoModal from './NuevoEmpleadoModal';

const ITEMS_PER_PAGE = 10;

const EmpleadosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { empleados, getPagedEmpleados, addEmpleado, updateEmpleado, bulkDeleteEmpleados } = useDataStore(); 
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
    const [isPagosModalOpen, setIsPagosModalOpen] = useState(false);
    const [empleadoParaEditar, setEmpleadoParaEditar] = useState<Empleado | null>(null);
    
    // State for filtering, pagination, and selection
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', activo: 'todos' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedEmpleados({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setSelectedIds(new Set());
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedEmpleados, empleados]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveEmpleado = (empleadoData: Omit<Empleado, 'id' | 'empresaId'>) => {
        if (empleadoParaEditar) {
            updateEmpleado({ ...empleadoParaEditar, ...empleadoData });
        } else {
            addEmpleado(empleadoData);
        }
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const handleSelectAll = (checked: boolean) => setSelectedIds(checked ? new Set(pagedData.items.map(e => e.id)) : new Set());
    const handleSelectOne = (id: number, checked: boolean) => setSelectedIds(prev => { const newSet = new Set(prev); if (checked) newSet.add(id); else newSet.delete(id); return newSet; });
    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;

    const handleBulkDelete = () => {
        if (window.confirm(`¿Está seguro que desea eliminar ${selectedIds.size} empleados?`)) {
            bulkDeleteEmpleados(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleExport = () => {
        const dataToExport = getPagedEmpleados({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(e => ({
            'Nombre': e.nombre,
            'Cedula': e.cedula,
            'Puesto': e.puesto,
            'Salario': e.salarioBrutoMensual,
            'Fecha Ingreso': e.fechaIngreso,
            'Activo': e.activo ? 'Sí' : 'No'
        })), 'empleados');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Empleados</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button variant="secondary" onClick={() => setIsBulkUploadOpen(true)}>📊 Cargar Excel</Button>
                    <Button variant="secondary" onClick={() => setIsPagosModalOpen(true)}>💰 Cargar Pagos</Button>
                    <Button leftIcon={<PlusIcon />} onClick={() => { setEmpleadoParaEditar(null); setIsModalOpen(true); }}>
                        Agregar Empleado
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Empleados</CardTitle>
                    <div className="mt-4 flex space-x-4">
                        <input 
                            type="text" 
                            placeholder="Buscar por nombre, cédula..." 
                            className="w-full md:w-1/2 px-3 py-2 border border-secondary-300 rounded-md" 
                            value={filters.searchTerm} 
                            onChange={e => handleFilterChange('searchTerm', e.target.value)} 
                        />
                        <select 
                            className="px-3 py-2 border border-secondary-300 rounded-md" 
                            value={filters.activo} 
                            onChange={e => handleFilterChange('activo', e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            <option value="activos">Solo Activos</option>
                            <option value="inactivos">Solo Inactivos</option>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cédula</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Puesto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Salario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha Ingreso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-4 text-secondary-500">No se encontraron empleados.</td></tr>
                                ): (
                                    pagedData.items.map(empleado => (
                                        <tr key={empleado.id} className={`hover:bg-secondary-50 ${selectedIds.has(empleado.id) ? 'bg-primary-50' : ''}`}>
                                            <td className="px-6 py-4"><Checkbox checked={selectedIds.has(empleado.id)} onChange={(checked) => handleSelectOne(empleado.id, checked)} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium space-x-4">
                                                <button onClick={() => { setEmpleadoParaEditar(empleado); setIsModalOpen(true); }} className="text-primary hover:text-primary-700">Editar</button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{empleado.nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{empleado.cedula}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{empleado.puesto}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(empleado.salarioBrutoMensual)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(empleado.fechaIngreso).toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                    empleado.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {empleado.activo ? 'Activo' : 'Inactivo'}
                                                </span>
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

            {/* Modals */}
            <NuevoEmpleadoModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveEmpleado} 
                empleadoParaEditar={empleadoParaEditar} 
            />
            <BulkUploadModal 
                isOpen={isBulkUploadOpen} 
                onClose={() => setIsBulkUploadOpen(false)} 
                type="empleados" 
                empresaId={selectedTenant?.id || 0} 
                onSuccess={() => {/* Refrescar datos */}} 
            />
            <BulkUploadModal 
                isOpen={isPagosModalOpen} 
                onClose={() => setIsPagosModalOpen(false)} 
                type="pagos-empleados" 
                empresaId={selectedTenant?.id || 0} 
                onSuccess={() => {/* Refrescar datos */}} 
            />
        </div>
    );
};

export default EmpleadosPage;