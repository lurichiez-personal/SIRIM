
import React from 'react';
import { useClientAuthStore } from '../../stores/useClientAuthStore.ts';
import { useDataStore } from '../../stores/useDataStore.ts';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card.tsx';
import { FacturaEstado } from '../../types.ts';

const PortalDashboardPage: React.FC = () => {
    const { clientUser } = useClientAuthStore();
    const { facturas } = useDataStore();
    
    if (!clientUser) return null;

    const misFacturas = facturas.filter(f => f.clienteId === clientUser.clienteId && f.estado !== FacturaEstado.Anulada);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const totalPendiente = misFacturas.reduce((acc, f) => acc + (Number(f.montoTotal) - Number(f.montoPagado)), 0);
    const facturasPendientes = misFacturas.filter(f => f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.Vencida || f.estado === FacturaEstado.PagadaParcialmente);
    const facturasVencidas = misFacturas.filter(f => f.estado === FacturaEstado.Vencida);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Balance Total Pendiente</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-yellow-600">{formatCurrency(totalPendiente)}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Facturas Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{facturasPendientes.length}</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Facturas Vencidas</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-3xl font-bold text-red-600">{facturasVencidas.length}</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default PortalDashboardPage;
