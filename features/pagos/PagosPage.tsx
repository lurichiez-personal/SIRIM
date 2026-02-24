
import React, { useState, useMemo } from 'react';
import { useDataStore } from '../../stores/useDataStore.ts';
import { Gasto, Nomina, CierreITBIS, MetodoPago, NominaStatus } from '../../types.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { formatCurrency } from '../../utils/formatters.ts';
import RegistrarPagoModal from './RegistrarPagoModal.tsx';

type PayableItem = Gasto | Nomina | CierreITBIS;
type PayableType = 'gasto' | 'nomina' | 'itbis';

const PagosPage: React.FC = () => {
    const { gastos, nominas, cierresITBIS, pagarGasto, pagarNomina, pagarITBIS } = useDataStore();
    const [activeTab, setActiveTab] = useState<'gastos' | 'nomina' | 'impuestos'>('gastos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [itemToPay, setItemToPay] = useState<{ item: PayableItem; type: PayableType } | null>(null);

    const payables = useMemo(() => {
        const gastosPorPagar = gastos.filter(g => g.metodoPago === MetodoPago['04-COMPRA A CREDITO'] && !g.pagado);
        const nominaPorPagar = nominas.filter(n => n.status === NominaStatus.Auditada);
        const impuestosPorPagar = cierresITBIS.filter(c => c.itbisAPagar > 0 && !c.pagado);
        return { gastos: gastosPorPagar, nomina: nominaPorPagar, impuestos: impuestosPorPagar };
    }, [gastos, nominas, cierresITBIS]);

    const handleOpenModal = (item: PayableItem, type: PayableType) => {
        setItemToPay({ item, type });
        setIsModalOpen(true);
    };

    const handleSavePago = async (fechaPago: string) => {
        if (!itemToPay) return;
        const { item, type } = itemToPay;
        try {
            if (type === 'gasto') {
                await pagarGasto(item.id, fechaPago);
            } else if (type === 'nomina') {
                await pagarNomina(item.id, fechaPago);
            } else if (type === 'itbis') {
                await pagarITBIS(item.id, fechaPago);
            }
        } catch (error) {
            console.error("Error al registrar el pago:", error);
        }
    };

    const handleQuickPay = async (gasto: Gasto) => {
        const fechaFormateada = new Date(gasto.fecha + 'T00:00:00').toLocaleDateString('es-DO');
        if (window.confirm(`¿Desea registrar el pago de esta factura con la misma fecha de emisión (${fechaFormateada})?`)) {
            try {
                await pagarGasto(gasto.id, gasto.fecha);
            } catch (error) {
                console.error("Error al registrar el pago rápido:", error);
            }
        }
    };

    const TabButton: React.FC<{ tabId: 'gastos' | 'nomina' | 'impuestos', label: string, count: number }> = ({ tabId, label, count }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                activeTab === tabId ? 'border-primary text-primary' : 'border-transparent text-secondary-500 hover:text-secondary-700'
            }`}
        >
            {label} <span className="ml-2 bg-secondary-200 text-secondary-700 text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>
        </button>
    );

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Cuentas por Pagar</h1>

            <Card>
                <CardHeader className="border-b">
                    <div className="flex space-x-2">
                        <TabButton tabId="gastos" label="Gastos a Crédito" count={payables.gastos.length} />
                        <TabButton tabId="nomina" label="Nómina" count={payables.nomina.length} />
                        <TabButton tabId="impuestos" label="Impuestos" count={payables.impuestos.length} />
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {activeTab === 'gastos' && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                            <thead><tr><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Proveedor</th><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha</th><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">NCF</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Monto</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acción</th></tr></thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                    {payables.gastos.length === 0 ? (<tr><td colSpan={5} className="text-center py-4 text-secondary-500">No hay gastos a crédito pendientes.</td></tr>) : 
                                    payables.gastos.map(g => (
                                        <tr key={g.id}>
                                            <td className="px-2 py-4 font-medium">{g.proveedorNombre}</td><td className="px-2 py-4">{new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-DO')}</td><td className="px-2 py-4">{g.ncf}</td><td className="px-2 py-4 text-right font-semibold">{formatCurrency(g.monto)}</td>
                                            <td className="px-2 py-4 text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <Button size="sm" onClick={() => handleOpenModal(g, 'gasto')}>Pagar</Button>
                                                    <Button size="sm" variant="secondary" onClick={() => handleQuickPay(g)} title="Pagar con fecha de factura">
                                                        <span className="text-xs whitespace-nowrap">Fecha Fact.</span>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                            </table>
                        </div>
                    )}
                     {activeTab === 'nomina' && (
                        <table className="min-w-full divide-y divide-secondary-200">
                           <thead><tr><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Período</th><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total a Pagar</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acción</th></tr></thead>
                           <tbody className="bg-white divide-y divide-secondary-200">
                                {payables.nomina.length === 0 ? (<tr><td colSpan={4} className="text-center py-4 text-secondary-500">No hay nóminas pendientes de pago.</td></tr>) :
                                payables.nomina.map(n => (
                                    <tr key={n.id}>
                                        <td className="px-2 py-4 font-medium">{n.periodo}</td><td className="px-2 py-4"><span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">{n.status}</span></td><td className="px-2 py-4 text-right font-semibold">{formatCurrency(n.totalPagado)}</td>
                                        <td className="px-2 py-4 text-right"><Button size="sm" onClick={() => handleOpenModal(n, 'nomina')}>Pagar Nómina</Button></td>
                                    </tr>
                                ))}
                           </tbody>
                        </table>
                    )}
                    {activeTab === 'impuestos' && (
                        <table className="min-w-full divide-y divide-secondary-200">
                           <thead><tr><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Impuesto</th><th className="py-3 text-left text-xs font-medium text-secondary-500 uppercase">Período</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Monto a Pagar</th><th className="py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acción</th></tr></thead>
                           <tbody className="bg-white divide-y divide-secondary-200">
                                {payables.impuestos.length === 0 ? (<tr><td colSpan={4} className="text-center py-4 text-secondary-500">No hay impuestos pendientes de pago.</td></tr>) :
                                payables.impuestos.map(i => (
                                    <tr key={i.id}>
                                        <td className="px-2 py-4 font-medium">ITBIS</td><td className="px-2 py-4">{i.periodo}</td><td className="px-2 py-4 text-right font-semibold">{formatCurrency(i.itbisAPagar)}</td>
                                        <td className="px-2 py-4 text-right"><Button size="sm" onClick={() => handleOpenModal(i, 'itbis')}>Pagar</Button></td>
                                    </tr>
                                ))}
                           </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>

            <RegistrarPagoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePago}
                itemToPay={itemToPay}
            />
        </div>
    );
};

export default PagosPage;
