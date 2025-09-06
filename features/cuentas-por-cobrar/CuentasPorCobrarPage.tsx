import React, { useState, useEffect, useMemo } from 'react';
import { Factura, FacturaEstado, Ingreso } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, DownloadIcon } from '../../components/icons/Icons';
import { useDataStore } from '../../stores/useDataStore';
import NuevoPagoModal from '../ingresos/NuevoPagoModal';
import Pagination from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/csvExport';

const ITEMS_PER_PAGE = 10;

interface CuentaPorCobrar extends Factura {
  diasVencimiento: number;
  montoPendiente: number;
}

const CuentasPorCobrarPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { facturas, addIngreso } = useDataStore();
    
    const [loading, setLoading] = useState(true);
    const [isPagoModalOpen, setIsPagoModalOpen] = useState(false);
    const [facturaParaPago, setFacturaParaPago] = useState<Factura | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useState({ 
        searchTerm: '', 
        rangoVencimiento: 'todos', // todos, vencidas, por-vencer, 30-dias, 60-dias, 90-dias
        startDate: '', 
        endDate: '' 
    });

    // Calcular cuentas por cobrar basándose en facturas con saldo pendiente
    const cuentasPorCobrar = useMemo(() => {
        if (!selectedTenant) return [];
        
        return facturas
            .filter(f => 
                f.empresaId === selectedTenant.id &&
                (f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente) &&
                f.montoPagado < f.montoTotal
            )
            .map(factura => {
                const fechaFactura = new Date(factura.fecha);
                const hoy = new Date();
                const diasVencimiento = Math.floor((hoy.getTime() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24));
                const montoPendiente = factura.montoTotal - factura.montoPagado;
                
                return {
                    ...factura,
                    diasVencimiento,
                    montoPendiente
                } as CuentaPorCobrar;
            })
            .sort((a, b) => b.diasVencimiento - a.diasVencimiento); // Ordenar por más vencidas primero
    }, [facturas, selectedTenant]);

    // Aplicar filtros
    const cuentasFiltradas = useMemo(() => {
        let filtered = cuentasPorCobrar;

        // Filtro de búsqueda
        if (filters.searchTerm) {
            filtered = filtered.filter(cuenta =>
                cuenta.clienteNombre.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                cuenta.ncf?.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
        }

        // Filtro por rango de vencimiento
        if (filters.rangoVencimiento !== 'todos') {
            switch (filters.rangoVencimiento) {
                case 'vencidas':
                    filtered = filtered.filter(c => c.diasVencimiento > 0);
                    break;
                case 'por-vencer':
                    filtered = filtered.filter(c => c.diasVencimiento <= 0);
                    break;
                case '30-dias':
                    filtered = filtered.filter(c => c.diasVencimiento > 30);
                    break;
                case '60-dias':
                    filtered = filtered.filter(c => c.diasVencimiento > 60);
                    break;
                case '90-dias':
                    filtered = filtered.filter(c => c.diasVencimiento > 90);
                    break;
            }
        }

        // Filtros de fecha
        if (filters.startDate) {
            filtered = filtered.filter(c => c.fecha >= filters.startDate);
        }
        if (filters.endDate) {
            filtered = filtered.filter(c => c.fecha <= filters.endDate);
        }

        return filtered;
    }, [cuentasPorCobrar, filters]);

    // Paginación
    const pagedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return {
            items: cuentasFiltradas.slice(startIndex, endIndex),
            totalCount: cuentasFiltradas.length
        };
    }, [cuentasFiltradas, currentPage]);

    // Estadísticas de resumen
    const estadisticas = useMemo(() => {
        const totalPorCobrar = cuentasFiltradas.reduce((sum, c) => sum + c.montoPendiente, 0);
        const vencidas = cuentasFiltradas.filter(c => c.diasVencimiento > 0);
        const totalVencido = vencidas.reduce((sum, c) => sum + c.montoPendiente, 0);
        
        return {
            totalPorCobrar,
            totalVencido,
            cantidadFacturas: cuentasFiltradas.length,
            cantidadVencidas: vencidas.length
        };
    }, [cuentasFiltradas]);

    useEffect(() => {
        if (selectedTenant) {
            setLoading(false);
        }
    }, [selectedTenant, facturas]);

    const handleFilterChange = (field: string, value: string) => {
        setFilters(prev => ({ ...prev, [field]: value }));
        setCurrentPage(1);
    };

    const handleRecibirPago = (factura: Factura) => {
        setFacturaParaPago(factura);
        setIsPagoModalOpen(true);
    };

    const handleSavePago = (pagoData: Omit<Ingreso, 'id' | 'empresaId' | 'conciliado'>) => {
        addIngreso(pagoData);
        setIsPagoModalOpen(false);
        setFacturaParaPago(null);
    };

    const handleExport = () => {
        exportToCSV(cuentasFiltradas.map(c => ({
            'NCF': c.ncf || 'N/A',
            'Cliente': c.clienteNombre,
            'Fecha Factura': c.fecha,
            'Días Vencimiento': c.diasVencimiento,
            'Monto Total': c.montoTotal,
            'Monto Pagado': c.montoPagado,
            'Monto Pendiente': c.montoPendiente,
            'Estado': c.estado
        })), 'cuentas_por_cobrar');
    };

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const getVencimientoBadge = (dias: number) => {
        if (dias <= 0) return 'bg-blue-100 text-blue-800';
        if (dias <= 30) return 'bg-yellow-100 text-yellow-800';
        if (dias <= 60) return 'bg-orange-100 text-orange-800';
        return 'bg-red-100 text-red-800';
    };

    const getVencimientoText = (dias: number) => {
        if (dias <= 0) return `${Math.abs(dias)} días restantes`;
        return `${dias} días vencida`;
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Cuentas por Cobrar</h1>
                <div className="flex space-x-2">
                    <Button variant="secondary" leftIcon={<DownloadIcon />} onClick={handleExport}>
                        Exportar a CSV
                    </Button>
                </div>
            </div>

            {/* Estadísticas de resumen */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div>
                                <p className="text-sm font-medium text-secondary-600">Total por Cobrar</p>
                                <p className="text-2xl font-bold text-secondary-900">{formatCurrency(estadisticas.totalPorCobrar)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div>
                                <p className="text-sm font-medium text-red-600">Vencido</p>
                                <p className="text-2xl font-bold text-red-900">{formatCurrency(estadisticas.totalVencido)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div>
                                <p className="text-sm font-medium text-secondary-600">Facturas Pendientes</p>
                                <p className="text-2xl font-bold text-secondary-900">{estadisticas.cantidadFacturas}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center">
                            <div>
                                <p className="text-sm font-medium text-red-600">Facturas Vencidas</p>
                                <p className="text-2xl font-bold text-red-900">{estadisticas.cantidadVencidas}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Cuentas por Cobrar</CardTitle>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input 
                            type="text" 
                            placeholder="Buscar por cliente o NCF..." 
                            className="col-span-2 px-3 py-2 border border-secondary-300 rounded-md" 
                            value={filters.searchTerm} 
                            onChange={e => handleFilterChange('searchTerm', e.target.value)} 
                        />
                        <select 
                            className="px-3 py-2 border border-secondary-300 rounded-md" 
                            value={filters.rangoVencimiento} 
                            onChange={e => handleFilterChange('rangoVencimiento', e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            <option value="por-vencer">Por Vencer</option>
                            <option value="vencidas">Vencidas</option>
                            <option value="30-dias">+ 30 días vencidas</option>
                            <option value="60-dias">+ 60 días vencidas</option>
                            <option value="90-dias">+ 90 días vencidas</option>
                        </select>
                        <div className="col-span-1 grid grid-cols-2 gap-2">
                            <input 
                                type="date" 
                                className="px-3 py-2 border border-secondary-300 rounded-md" 
                                value={filters.startDate} 
                                onChange={e => handleFilterChange('startDate', e.target.value)} 
                            />
                            <input 
                                type="date" 
                                className="px-3 py-2 border border-secondary-300 rounded-md" 
                                value={filters.endDate} 
                                onChange={e => handleFilterChange('endDate', e.target.value)} 
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">NCF</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Fecha Factura</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Monto Pendiente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Vencimiento</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando...</td></tr>
                                ) : pagedData.items.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay cuentas por cobrar que coincidan con los filtros.</td></tr>
                                ) : (
                                    pagedData.items.map(cuenta => (
                                        <tr key={cuenta.id} className="hover:bg-secondary-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">
                                                {cuenta.ncf || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                {cuenta.clienteNombre}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                {new Date(cuenta.fecha).toLocaleDateString('es-DO')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-secondary-900">
                                                {formatCurrency(cuenta.montoPendiente)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getVencimientoBadge(cuenta.diasVencimiento)}`}>
                                                    {getVencimientoText(cuenta.diasVencimiento)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <Button 
                                                    size="sm" 
                                                    variant="primary" 
                                                    onClick={() => handleRecibirPago(cuenta)}
                                                >
                                                    Recibir Pago
                                                </Button>
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

export default CuentasPorCobrarPage;