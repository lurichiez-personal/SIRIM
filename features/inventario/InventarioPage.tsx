import React, { useState, useEffect, useMemo } from 'react';
import { Item } from '../../types.ts';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons.tsx';
import NuevoItemModal from './NuevoItemModal.tsx';
import { useDataStore } from '../../stores/useDataStore.ts';
import Pagination from '../../components/ui/Pagination.tsx';
import { exportToCSV } from '../../utils/csvExport.ts';
import { applyPagination } from '../../utils/pagination.ts';

const ITEMS_PER_PAGE = 10;

const InventarioPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { items, addItem, updateItem, isLoading } = useDataStore();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemParaEditar, setItemParaEditar] = useState<Item | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    
    const pagedData = useMemo(() => {
        let filtered = [...items];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(i =>
                i.nombre.toLowerCase().includes(lowerTerm) ||
                i.codigo.toLowerCase().includes(lowerTerm)
            );
        }

        return applyPagination(filtered, currentPage, ITEMS_PER_PAGE);

    }, [items, currentPage, searchTerm]);

    const handleOpenModalParaCrear = () => {
        setItemParaEditar(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (item: Item) => {
        setItemParaEditar(item);
        setIsModalOpen(true);
    };

    const handleSaveItem = async (itemData: Omit<Item, 'id' | 'empresaId'>) => {
        try {
            if (itemParaEditar) {
                await updateItem({ ...itemParaEditar, ...itemData });
            } else {
                await addItem(itemData);
            }
        } catch (error) {
            console.error("Failed to save item:", error);
            throw error; // Re-throw so the modal can catch it and stay open
        }
    };
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const handleExport = () => {
        exportToCSV(pagedData.items.map(i => ({
            'Codigo': i.codigo,
            'Nombre': i.nombre,
            'Descripcion': i.descripcion,
            'Precio': i.precio,
            'Stock Disponible': i.cantidadDisponible === undefined ? 'N/A' : i.cantidadDisponible,
        })), 'inventario');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Inventario</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button leftIcon={<PlusIcon/>} onClick={handleOpenModalParaCrear}>
                        Nuevo Ítem
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Productos y Servicios</CardTitle>
                    <div className="mt-4">
                        <input
                            type="text"
                            placeholder="Buscar por código o nombre..."
                            className="w-full md:w-1/3 px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Código</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Precio Unitario</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Stock Disponible</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={5} className="text-center py-4 text-secondary-500">No hay ítems para esta empresa.</td></tr>
                                ) : (
                                    pagedData.items.map(item => (
                                        <tr key={item.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{item.codigo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{item.nombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-semibold">{formatCurrency(item.precio)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                                {item.cantidadDisponible === undefined ? 'N/A' :
                                                 item.cantidadDisponible <= 5 ? <span className="text-red-600">{item.cantidadDisponible}</span> : item.cantidadDisponible}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleOpenModalParaEditar(item)} className="text-primary hover:text-primary-700">
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
            
            <NuevoItemModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveItem}
                itemParaEditar={itemParaEditar}
            />
        </div>
    );
};

export default InventarioPage;