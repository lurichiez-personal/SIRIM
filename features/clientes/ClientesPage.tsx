
import React, { useState, useMemo } from 'react';
import { Cliente, Permission } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon, TrashIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../../components/icons/Icons.tsx';
import NuevoClienteModal from './NuevoClienteModal.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import Pagination from '../../components/ui/Pagination.tsx';
import Checkbox from '../../components/ui/Checkbox.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import Can from '../../components/Can.tsx';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';
import { useAlertStore } from '../../stores/useAlertStore.ts';
import { applyPagination } from '../../utils/pagination.ts';

const ITEMS_PER_PAGE = 10;

type SortField = keyof Cliente;

const ClientesPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { clientes, addCliente, updateCliente, bulkUpdateClienteStatus, deleteCliente, bulkDeleteClientes, isLoading } = useDataStore();
    const { showConfirmation } = useConfirmationStore();
    const { showAlert } = useAlertStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');
    const [sortConfig, setSortConfig] = useState<{ field: SortField, direction: 'asc' | 'desc' } | null>(null);
    
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const pagedData = useMemo(() => {
        let filtered = [...clientes];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(c => c.nombre.toLowerCase().includes(lowerTerm) || c.rnc?.toLowerCase().includes(lowerTerm));
        }
        if (statusFilter !== 'todos') {
            const isActive = statusFilter === 'activo';
            filtered = filtered.filter(c => c.activo === isActive);
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
             filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return applyPagination(filtered, currentPage, ITEMS_PER_PAGE);

    }, [clientes, currentPage, searchTerm, statusFilter, sortConfig]);

    const handleSort = (field: SortField) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.field === field && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ field, direction });
    };

    const getSortIcon = (field: SortField) => {
        if (!sortConfig || sortConfig.field !== field) {
            return <ChevronUpDownIcon className="h-4 w-4 ml-2 text-secondary-400" />;
        }
        return sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4 ml-2" /> : <ChevronDownIcon className="h-4 w-4 ml-2" />;
    };
    
    const handleOpenModalParaCrear = () => {
        setClienteParaEditar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (cliente: Cliente) => {
        setClienteParaEditar(cliente);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setClienteParaEditar(null);
    };

    const handleSaveClient = async (clientData: Omit<Cliente, 'id' | 'empresaId' | 'createdAt'>) => {
        try {
            if (clienteParaEditar) {
                await updateCliente({ ...clienteParaEditar, ...clientData });
            } else {
                await addCliente(clientData);
            }
        } catch (error) {
            console.error("Failed to save client:", error);
            throw error; // Re-throw to be caught by the modal
        }
    };
    
    const handleDeleteClient = (cliente: Cliente) => {
        showConfirmation(
            'Confirmar Eliminación',
            `¿Está seguro de que desea eliminar a "${cliente.nombre}"? Esta acción no se puede deshacer.`,
            async () => {
                try {
                    await deleteCliente(cliente.id);
                    showAlert('Éxito', 'Cliente eliminado correctamente.');
                } catch (error) {
                    // The error is already shown by the alert store in useDataStore
                }
            }
        );
    };

    const handleBulkDelete = () => {
        showConfirmation(
            'Confirmar Eliminación Masiva',
            `¿Está seguro de que desea eliminar ${selectedIds.size} clientes? Esta acción no se puede deshacer.`,
            async () => {
                await bulkDeleteClientes(Array.from(selectedIds));
                setSelectedIds(new Set()); // Clear selection after action
            }
        );
    };

    const getEstadoDGIIBadge = (estado: string | undefined) => {
        if (!estado) return null;
        switch (estado.toUpperCase()) {
            case 'ACTIVO': return 'bg-blue-100 text-blue-800';
            case 'SUSPENDIDO': return 'bg-red-100 text-red-800';
            default: return 'bg-secondary-100 text-secondary-800';
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(pagedData.items.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleSelectOne = (id: string, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;
    
    const handleBulkAction = async (activo: boolean) => {
        await bulkUpdateClienteStatus(Array.from(selectedIds), activo);
        setSelectedIds(new Set());
    };
    
    const handleExport = () => {
        if (!selectedTenant) return;
        // Use the memoized and filtered data for export, but without pagination
        const dataToExport = pagedData.items; 
        exportToCSV(dataToExport.map(c => ({
            'Nombre': c.nombre,
            'RNC': c.rnc,
            'Email': c.email,
            'Telefono': c.telefono,
            'Estado Interno': c.activo ? 'Activo' : 'Inactivo',
            'Estado DGII': c.estadoDGII,
            'Creado en': new Date(c.createdAt).toLocaleDateString('es-DO'),
        })), 'clientes');
    };
    
    const SortableHeader: React.FC<{ field: SortField, title: string }> = ({ field, title }) => (
        <th 
            className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center">
                {title}
                {getSortIcon(field)}
            </div>
        </th>
    );

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-secondary-800">Clientes</h1>
                <div className="flex space-x-2 w-full md:w-auto">
                    <Button variant="secondary" leftIcon={<DownloadIcon/>} onClick={handleExport} className="flex-1 md:flex-none">
                        Exportar
                    </Button>
                    <Button leftIcon={<PlusIcon/>} onClick={handleOpenModalParaCrear} className="flex-1 md:flex-none">
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Clientes</CardTitle>
                    <div className="mt-4 flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RNC..."
                            className="w-full md:w-1/3 px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                        <select
                            className="w-full md:w-auto px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                        >
                            <option value="todos">Todos los estados</option>
                            <option value="activo">Activo</option>
                            <option value="inactivo">Inactivo</option>
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    {selectedIds.size > 0 && (
                        <div className="bg-primary-50 p-3 rounded-md mb-4 flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-4">
                            <p className="text-sm font-semibold">{selectedIds.size} seleccionado(s)</p>
                            <div className="flex space-x-2">
                                <Button size="sm" onClick={() => handleBulkAction(true)}>Marcar como Activo</Button>
                                <Button size="sm" variant="secondary" onClick={() => handleBulkAction(false)}>Marcar como Inactivo</Button>
                                <Can I={Permission.ELIMINAR_CLIENTES}>
                                    <Button size="sm" variant="danger" onClick={handleBulkDelete} leftIcon={<TrashIcon />}>Eliminar</Button>
                                </Can>
                            </div>
                        </div>
                    )}
                    
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden md:block">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left w-12"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                    <SortableHeader field="nombre" title="Nombre / Razón Social" />
                                    <SortableHeader field="rnc" title="RNC" />
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado DGII</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado Interno</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {isLoading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No se encontraron clientes.</td></tr>
                                ) : (
                                    pagedData.items.map(cliente => (
                                        <tr key={cliente.id} className={`hover:bg-secondary-50 ${selectedIds.has(cliente.id) ? 'bg-primary-50' : ''}`}>
                                            <td className="px-6 py-4"><Checkbox checked={selectedIds.has(cliente.id)} onChange={(checked) => handleSelectOne(cliente.id, checked)} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{cliente.nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{cliente.rnc}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                {cliente.estadoDGII && (
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoDGIIBadge(cliente.estadoDGII)}`}>
                                                        {cliente.estadoDGII}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cliente.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {cliente.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end space-x-4">
                                                    <button onClick={() => handleOpenModalParaEditar(cliente)} className="text-primary hover:text-primary-700">
                                                        Editar
                                                    </button>
                                                    <Can I={Permission.ELIMINAR_CLIENTES}>
                                                        <button onClick={() => handleDeleteClient(cliente)} className="text-red-600 hover:text-red-800" title="Eliminar Cliente">
                                                            <TrashIcon className="h-5 w-5" />
                                                        </button>
                                                    </Can>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                         {isLoading ? (
                            <p className="text-center py-4">Cargando...</p>
                        ) : pagedData.items.length === 0 ? (
                            <p className="text-center py-4 text-secondary-500">No se encontraron clientes.</p>
                        ) : (
                            pagedData.items.map(cliente => (
                                <Card key={cliente.id} className={`p-4 ${selectedIds.has(cliente.id) ? 'bg-primary-50 border-primary' : ''}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-secondary-800">{cliente.nombre}</h3>
                                            <p className="text-sm text-secondary-600">{cliente.rnc}</p>
                                        </div>
                                        <Checkbox checked={selectedIds.has(cliente.id)} onChange={(checked) => handleSelectOne(cliente.id, checked)} />
                                    </div>
                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-secondary-500">Estado DGII:</span>
                                             {cliente.estadoDGII && (
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoDGIIBadge(cliente.estadoDGII)}`}>
                                                    {cliente.estadoDGII}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium text-secondary-500">Estado Interno:</span>
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cliente.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {cliente.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 text-right flex items-center justify-end space-x-4">
                                         <button onClick={() => handleOpenModalParaEditar(cliente)} className="text-primary hover:text-primary-700 text-sm font-semibold">
                                            Editar
                                        </button>
                                        <Can I={Permission.ELIMINAR_CLIENTES}>
                                            <button onClick={() => handleDeleteClient(cliente)} className="text-red-600 hover:text-red-800">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </Can>
                                    </div>
                                </Card>
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
            
            <NuevoClienteModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveClient}
                clienteParaEditar={clienteParaEditar}
            />
        </div>
    );
};

export default ClientesPage;
