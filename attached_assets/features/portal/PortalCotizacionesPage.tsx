
import React from 'react';
import { useClientAuthStore } from '../../stores/useClientAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { CotizacionEstado } from '../../types';
import Button from '../../components/ui/Button';

const PortalCotizacionesPage: React.FC = () => {
    const { clientUser } = useClientAuthStore();
    const { cotizaciones, updateCotizacionStatus } = useDataStore();

    if (!clientUser) return null;

    const misCotizaciones = cotizaciones.filter(c => c.clienteId === clientUser.clienteId);

    const handleUpdateStatus = (id: number, status: CotizacionEstado) => {
        if (window.confirm(`¿Seguro que desea ${status === CotizacionEstado.Aprobada ? 'aprobar' : 'rechazar'} esta cotización?`)) {
            updateCotizacionStatus(id, status);
        }
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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Cotizaciones</CardTitle>
            </CardHeader>
            <CardContent>
                <table className="min-w-full divide-y divide-secondary-200">
                    <thead>
                         <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">#</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Estado</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                        {misCotizaciones.map(c => (
                            <tr key={c.id}>
                                <td className="px-4 py-4 font-medium">{c.id}</td>
                                <td className="px-4 py-4">{new Date(c.fecha).toLocaleDateString('es-DO')}</td>
                                <td className="px-4 py-4 text-right">{formatCurrency(c.montoTotal)}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(c.estado)}`}>
                                        {c.estado}
                                    </span>
                                </td>
                                <td className="px-4 py-4 text-center space-x-2">
                                    {c.estado === CotizacionEstado.Pendiente && (
                                        <>
                                            <Button size="sm" onClick={() => handleUpdateStatus(c.id, CotizacionEstado.Aprobada)}>Aprobar</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleUpdateStatus(c.id, CotizacionEstado.Rechazada)}>Rechazar</Button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};

export default PortalCotizacionesPage;
