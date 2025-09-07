
import React from 'react';
import { useClientAuthStore } from '../../stores/useClientAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { FacturaEstado } from '../../types';

const PortalFacturasPage: React.FC = () => {
    const { clientUser } = useClientAuthStore();
    const { facturas } = useDataStore();

    if (!clientUser) return null;

    const misFacturas = facturas.filter(f => f.clienteId === clientUser.clienteId);

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

    return (
        <Card>
            <CardHeader>
                <CardTitle>Historial de Facturas</CardTitle>
            </CardHeader>
            <CardContent>
                <table className="min-w-full divide-y divide-secondary-200">
                    <thead>
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">NCF</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Balance</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Estado</th>
                        </tr>
                    </thead>
                     <tbody className="bg-white divide-y divide-secondary-200">
                        {misFacturas.map(f => (
                            <tr key={f.id}>
                                <td className="px-4 py-4 font-medium">{f.ncf}</td>
                                <td className="px-4 py-4">{new Date(f.fecha).toLocaleDateString('es-DO')}</td>
                                <td className="px-4 py-4 text-right">{formatCurrency(f.montoTotal)}</td>
                                <td className="px-4 py-4 text-right font-semibold">{formatCurrency(f.montoTotal - f.montoPagado)}</td>
                                <td className="px-4 py-4 text-center">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(f.estado)}`}>
                                        {f.estado}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    );
};

export default PortalFacturasPage;
