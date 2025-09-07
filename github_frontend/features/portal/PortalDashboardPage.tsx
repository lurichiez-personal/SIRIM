
import React from 'react';
import { useClientAuthStore } from '../../stores/useClientAuthStore';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { FacturaEstado, CotizacionEstado } from '../../types';

const PortalDashboardPage: React.FC = () => {
    const { clientUser } = useClientAuthStore();
    const { facturas, cotizaciones } = useDataStore();

    if (!clientUser) return null;

    const misFacturasPendientes = facturas.filter(f => 
        f.clienteId === clientUser.clienteId &&
        (f.estado === FacturaEstado.Emitida || f.estado === FacturaEstado.PagadaParcialmente || f.estado === FacturaEstado.Vencida)
    );
    const misCotizacionesPendientes = cotizaciones.filter(c =>
        c.clienteId === clientUser.clienteId &&
        c.estado === CotizacionEstado.Pendiente
    );
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-secondary-800">Resumen de Cuenta</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Facturas Pendientes de Pago</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-red-600">{misFacturasPendientes.length}</p>
                        <p className="text-secondary-600">Monto total por pagar: {formatCurrency(misFacturasPendientes.reduce((sum, f) => sum + (f.montoTotal - f.montoPagado), 0))}</p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Cotizaciones Pendientes de Aprobación</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold text-yellow-600">{misCotizacionesPendientes.length}</p>
                        <p className="text-secondary-600">Monto total por aprobar: {formatCurrency(misCotizacionesPendientes.reduce((sum, c) => sum + c.montoTotal, 0))}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PortalDashboardPage;
