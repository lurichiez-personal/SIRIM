
import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { formatCurrency } from '../../utils/formatters.ts';
import MarcarPagoAnticipoModal from './MarcarPagoAnticipoModal.tsx';
import { InformationCircleIcon, ClockIcon } from '../../components/icons/Icons.tsx';
import { calculateTaxPenalties } from '../../utils/taxCalculations.ts';

type Cuota = {
    numero: number;
    fechaLimite: string;
    monto: number;
    estado: 'Pagado' | 'Pendiente' | 'Vencido' | 'Próximo a Pagar';
    pago?: any;
};

const AnticiposISRPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getAnticiposISRData, marcarAnticipoPagado } = useDataStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cuotaParaPagar, setCuotaParaPagar] = useState<Cuota | null>(null);

    const anticiposData = useMemo(() => getAnticiposISRData(), [getAnticiposISRData, selectedTenant]);

    const handleOpenModal = (cuota: Cuota) => {
        setCuotaParaPagar(cuota);
        setIsModalOpen(true);
    };

    const handleSavePago = async (fechaPago: string, montoPagado: number) => {
        if (!cuotaParaPagar || !selectedTenant) return;
        await marcarAnticipoPagado({
            periodoFiscal: String(anticiposData.periodoFiscal),
            numeroCuota: cuotaParaPagar.numero,
            montoPagado,
            fechaPago,
        });
    };

    const getStatusBadge = (estado: Cuota['estado']) => {
        const map = {
            'Pagado': 'bg-green-100 text-green-800',
            'Pendiente': 'bg-gray-100 text-gray-800',
            'Vencido': 'bg-red-100 text-red-800',
            'Próximo a Pagar': 'bg-blue-100 text-blue-800',
        };
        return map[estado] || 'bg-secondary-100 text-secondary-800';
    };

    const renderPenaltyInfo = (cuota: Cuota) => {
        if (cuota.estado !== 'Vencido') return null;
        
        const penalties = calculateTaxPenalties(cuota.monto, cuota.fechaLimite);
        
        return (
            <div className="text-xs text-red-600 mt-1 bg-red-50 p-1.5 rounded border border-red-100">
                <div className="flex items-center font-bold mb-1">
                    <ClockIcon className="h-3 w-3 mr-1"/>
                    <span>{penalties.monthsLate} mes(es) de atraso</span>
                </div>
                <div className="grid grid-cols-2 gap-x-2">
                    <span>Base:</span> <span className="text-right">{formatCurrency(cuota.monto)}</span>
                    <span>Mora ({(penalties.moraRate * 100).toFixed(0)}%):</span> <span className="text-right">{formatCurrency(penalties.moraAmount)}</span>
                    <span>Interés ({(penalties.interestRate * 100).toFixed(1)}%):</span> <span className="text-right">{formatCurrency(penalties.interestAmount)}</span>
                    <span className="font-bold border-t border-red-200 mt-1 pt-1">Total:</span> <span className="font-bold border-t border-red-200 mt-1 pt-1 text-right">{formatCurrency(penalties.totalToPay)}</span>
                </div>
            </div>
        );
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/dashboard/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Gestión de Anticipos ISR</h1>

            <Card>
                <CardHeader>
                    <CardTitle>Proyección de Anticipos para el Período Fiscal {anticiposData.periodoFiscal}</CardTitle>
                    <div className="text-sm text-secondary-600 mt-2 p-3 bg-secondary-50 rounded-md">
                        <p>
                            Impuesto Liquidado (Año Anterior): <span className="font-bold">{formatCurrency(selectedTenant?.impuestoLiquidadoAnterior || 0)}</span>
                        </p>
                        <p>
                            Ingresos Brutos (Año Anterior): <span className="font-bold">{formatCurrency(selectedTenant?.ingresosBrutosAnterior || 0)}</span>
                        </p>
                        <div className="flex items-center mt-2 font-semibold text-primary">
                            <InformationCircleIcon className="h-5 w-5 mr-1"/>
                            <p>Tasa Efectiva de Tributación (TET) calculada: <span className="font-bold">{(anticiposData.tet * 100).toFixed(2)}%</span>. {anticiposData.ruleMessage}</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!anticiposData.isConfigured ? (
                        <div className="text-center py-8">
                            <p className="text-secondary-600">No se ha configurado el Impuesto Liquidado y/o los Ingresos Brutos del período anterior para esta empresa.</p>
                            <Link to="/dashboard/configuracion/empresas">
                                <Button className="mt-4">Configurar Empresa</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cuota</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha Límite</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Monto Base</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {anticiposData.pagos.map(cuota => (
                                        <tr key={cuota.numero} className={cuota.estado === 'Vencido' ? 'bg-red-50/10' : ''}>
                                            <td className="px-6 py-4 font-medium align-top">
                                                Cuota #{cuota.numero}
                                                {renderPenaltyInfo(cuota)}
                                            </td>
                                            <td className="px-6 py-4 align-top">{new Date(cuota.fechaLimite + 'T00:00:00').toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 text-right font-semibold align-top">{formatCurrency(cuota.monto)}</td>
                                            <td className="px-6 py-4 text-center align-top">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(cuota.estado)}`}>
                                                    {cuota.estado === 'Pagado' ? `Pagado el ${new Date(cuota.pago.fechaPago + 'T00:00:00').toLocaleDateString('es-DO')}` : cuota.estado}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right align-top">
                                                {cuota.estado !== 'Pagado' && (
                                                    <Button size="sm" onClick={() => handleOpenModal(cuota)}>
                                                        Registrar Pago
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <MarcarPagoAnticipoModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSavePago}
                cuota={cuotaParaPagar}
            />
        </div>
    );
};

export default AnticiposISRPage;
