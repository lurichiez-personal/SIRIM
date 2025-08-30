
import React, { useState, useEffect, useMemo } from 'react';
import { Cliente } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useTaskStore } from '../../stores/useTaskStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon, InformationCircleIcon } from '../../components/icons/Icons';
import NuevoClienteModal from './NuevoClienteModal';
import { useDataStore } from '../../stores/useDataStore';
import Pagination from '../../components/ui/Pagination';
import Checkbox from '../../components/ui/Checkbox';
import { exportToCSV } from '../../utils/csvExport';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';

const ITEMS_PER_PAGE = 10;

const RNCStatus: React.FC = () => {
    const { status, lastUpdated, recordCount, errorMessage, progress } = useDGIIDataStore();
    let text = '';
    let color = 'text-secondary-500';
    let showProgress = false;

    switch(status) {
        case 'checking': text = 'Verificando base de datos local...'; break;
        case 'downloading': 
            text = 'Descargando archivo de la DGII...'; 
            color = 'text-blue-600'; 
            showProgress = true;
            break;
        case 'processing': 
            text = `Procesando y guardando datos... (${progress}%)`; 
            color = 'text-blue-600';
            showProgress = true;
            break;
        case 'ready': 
            text = `Base de datos local lista. ${recordCount.toLocaleString()} registros. Última actualización: ${new Date(lastUpdated).toLocaleString('es-DO')}`;
            color = 'text-green-600';
            break;
        case 'error': text = `Error: ${errorMessage}`; color = 'text-red-600'; break;
        case 'idle': text = 'Iniciando descarga de la base de datos de RNC...'; break;
    }

    return (
        <div>
            <div className={`text-xs mt-2 flex items-center ${color}`}>
                <InformationCircleIcon className="h-4 w-4 mr-1"/>
                <span>{text}</span>
            </div>
            {showProgress && (
                <div className="w-full bg-secondary-200 rounded-full h-1.5 mt-2">
                    <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.2s ease-in-out' }}></div>
                </div>
            )}
        </div>
    );
};

const ClientesPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { clientes, addCliente, updateCliente, getPagedClientes, bulkUpdateClienteStatus } = useDataStore();
    const { status: rncStatus, triggerUpdate: triggerRNCUpdate } = useDGIIDataStore();
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clienteParaEditar, setClienteParaEditar] = useState<Cliente | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'activo' | 'inactivo'>('todos');
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });
    
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedClientes({
                page: currentPage,
                pageSize: ITEMS_PER_PAGE,
                searchTerm,
                status: statusFilter
            });
            setPagedData(data);
            setSelectedIds(new Set());
            setLoading(false);
        }
    }, [selectedTenant, currentPage, searchTerm, statusFilter, getPagedClientes, clientes]);
    
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

    const handleSaveClient = (clientData: Omit<Cliente, 'id' | 'empresaId' | 'createdAt'>) => {
        if (clienteParaEditar) {
            updateCliente({ ...clienteParaEditar, ...clientData });
        } else {
            addCliente(clientData);
        }
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
    
    const handleSelectOne = (id: number, checked: boolean) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (checked) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const isAllSelected = pagedData.items.length > 0 && selectedIds.size === pagedData.items.length;
    
    const handleBulkAction = (activo: boolean) => {
        bulkUpdateClienteStatus(Array.from(selectedIds), activo);
        setSelectedIds(new Set());
    };
    
    const handleExport = () => {
        const dataToExport = getPagedClientes({ page: 1, pageSize: pagedData.totalCount, searchTerm, status: statusFilter }).items;
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

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Clientes</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon/>} onClick={handleExport}>
                        Exportar a CSV
                    </Button>
                    <Button leftIcon={<PlusIcon/>} onClick={handleOpenModalParaCrear}>
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            <Card className="mb-6">
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Base de Datos de RNC (DGII)</CardTitle>
                        <Button 
                            variant="secondary" 
                            onClick={triggerRNCUpdate}
                            disabled={rncStatus === 'downloading' || rncStatus === 'processing'}
                        >
                            {rncStatus === 'downloading' || rncStatus === 'processing' ? 'Actualizando...' : 'Actualizar Ahora'}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <RNCStatus />
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <CardTitle>Listado de Clientes</CardTitle>
                    <div className="mt-4 flex space-x-4">
                        <input
                            type="text"
                            placeholder="Buscar por nombre o RNC..."
                            className="w-full md:w-1/3 px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                        <select
                            className="px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
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
                        <div className="bg-primary-50 p-3 rounded-md mb-4 flex items-center space-x-4">
                            <p className="text-sm font-semibold">{selectedIds.size} seleccionado(s)</p>
                            <Button size="sm" onClick={() => handleBulkAction(true)}>Marcar como Activo</Button>
                            <Button size="sm" variant="secondary" onClick={() => handleBulkAction(false)}>Marcar como Inactivo</Button>
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left w-12"><Checkbox checked={isAllSelected} onChange={handleSelectAll} /></th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Nombre / Razón Social</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">RNC</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado DGII</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado Interno</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {loading ? (
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
                                                <button onClick={() => handleOpenModalParaEditar(cliente)} className="text-primary hover:text-primary-700">
                                                    Editar
                                                </button>
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
