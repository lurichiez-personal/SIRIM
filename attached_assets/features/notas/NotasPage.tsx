import React, { useState, useEffect } from 'react';
import { NotaCreditoDebito, Factura, FacturaEstado, NCFType, CodigoModificacionNCF, NotaType } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons';
import NuevaNotaModal from './NuevaNotaModal';
import { useDataStore } from '../../stores/useDataStore';
import { useNCFStore } from '../../stores/useNCFStore';
import Pagination from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/csvExport';

const ITEMS_PER_PAGE = 10;

const NotasPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { facturas, addNota, updateFacturaStatus, getPagedNotas } = useDataStore();
    const { getNextNCF } = useNCFStore();
    
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ searchTerm: '', startDate: '', endDate: '' });
    const [pagedData, setPagedData] = useState({ items: [], totalCount: 0 });

    useEffect(() => {
        if (selectedTenant) {
            setLoading(true);
            const data = getPagedNotas({ page: currentPage, pageSize: ITEMS_PER_PAGE, ...filters });
            setPagedData(data);
            setLoading(false);
        }
    }, [selectedTenant, currentPage, filters, getPagedNotas]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleSaveNota = async (data: { 
        facturaAfectada: Factura, 
        codigoModificacion: keyof typeof CodigoModificacionNCF, 
        fecha: string, 
        descripcion: string,
        subtotal: number,
        itbis: number,
        isc: number,
        propinaLegal: number,
        montoTotal: number,
        aplicaITBIS: boolean,
        aplicaISC: boolean,
        aplicaPropina: boolean
    }) => {
        if (!selectedTenant) return;
        
        const { facturaAfectada, codigoModificacion, fecha, descripcion, ...amounts } = data;

        const ncf = await getNextNCF(selectedTenant.id, NCFType.B04);
        if (!ncf) {
            alert('Error: No hay NCF de tipo Nota de Crédito (B04) disponibles. Por favor, configure nuevas secuencias.');
            return;
        }

        const newNota: Omit<NotaCreditoDebito, 'id' | 'empresaId'> = {
            tipo: NotaType.Credito,
            facturaAfectadaId: facturaAfectada.id,
            facturaAfectadaNCF: facturaAfectada.ncf || 'N/A',
            ncf,
            fecha,
            clienteId: facturaAfectada.clienteId,
            clienteNombre: facturaAfectada.clienteNombre,
            subtotal: amounts.subtotal,
            aplicaITBIS: amounts.aplicaITBIS,
            aplicaISC: amounts.aplicaISC,
            isc: amounts.isc,
            itbis: amounts.itbis,
            aplicaPropina: amounts.aplicaPropina,
            propinaLegal: amounts.propinaLegal,
            montoTotal: amounts.montoTotal,
            codigoModificacion,
            descripcion,
        };
        
        addNota(newNota);

        if (codigoModificacion === '01') { // 01 - Anulación de Factura
            updateFacturaStatus(facturaAfectada.id, FacturaEstado.Anulada);
        }
    };
    
    const handleExport = () => {
        const dataToExport = getPagedNotas({ ...filters, page: 1, pageSize: pagedData.totalCount }).items;
        exportToCSV(dataToExport.map(n => ({
            'NCF Nota': n.ncf,
            'Tipo': n.tipo,
            'Fecha': n.fecha,
            'Cliente': n.clienteNombre,
            'NCF Factura Afectada': n.facturaAfectadaNCF,
            'Monto Total': n.montoTotal,
            'Motivo': CodigoModificacionNCF[n.codigoModificacion],
        })), 'notas_credito');
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);
    };

    const getCodigoText = (codigo: keyof typeof CodigoModificacionNCF) => {
        return CodigoModificacionNCF[codigo] || codigo;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Notas de Crédito y Débito</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>Exportar a CSV</Button>
                    <Button leftIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
                        Nueva Nota
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Notas Emitidas</CardTitle>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" placeholder="Buscar por cliente o NCF..." className="col-span-1 px-3 py-2 border border-secondary-300 rounded-md" value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} />
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">NCF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Factura Afectada</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Motivo</th>
                                </tr>
                            </thead>
                             <tbody className="bg-white divide-y divide-secondary-200">
                                {loading ? (
                                    <tr><td colSpan={7} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4 text-secondary-500">No hay notas emitidas para esta empresa.</td></tr>
                                ) : (
                                    pagedData.items.map(nota => (
                                        <tr key={nota.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 capitalize">{nota.tipo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{nota.ncf}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{nota.clienteNombre}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(nota.fecha).toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-primary hover:underline cursor-pointer">{nota.facturaAfectadaNCF}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary-500">{formatCurrency(nota.montoTotal)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{getCodigoText(nota.codigoModificacion)}</td>
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

            <NuevaNotaModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveNota}
                facturasDisponibles={facturas.filter(f => f.estado !== FacturaEstado.Anulada)}
            />
        </div>
    );
};

export default NotasPage;