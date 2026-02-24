import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { useConfirmationStore } from '../../stores/useConfirmationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';

const CierreITBISPage: React.FC = () => {
    const { cierresITBIS, realizarCierreITBIS } = useDataStore();
    const { showAlert } = useAlertStore();
    const { showConfirmation } = useConfirmationStore();
    const [isLoading, setIsLoading] = useState(false);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const { periodoSugerido, cierreExistente } = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 1-12

        // Suggest closing last month if we are in the first few days of the new month
        const targetDate = new Date(year, month - 1, now.getDate() < 15 ? -1 : 0);
        const targetYear = targetDate.getFullYear();
        const targetMonth = String(targetDate.getMonth() + 1).padStart(2, '0');
        const periodo = `${targetYear}-${targetMonth}`;

        const existe = cierresITBIS.some(c => c.periodo === periodo);

        return { periodoSugerido: periodo, cierreExistente: existe };
    }, [cierresITBIS]);

    const handleRealizarCierre = () => {
        showConfirmation(
            'Confirmar Cierre de ITBIS',
            `Está a punto de realizar el cierre fiscal para el período ${periodoSugerido}. Esta acción creará un registro permanente y no se puede deshacer. ¿Desea continuar?`,
            async () => {
                setIsLoading(true);
                try {
                    await realizarCierreITBIS(periodoSugerido);
                    showAlert('Cierre Exitoso', `Se ha guardado el cierre de ITBIS para el período ${periodoSugerido}.`);
                } catch (error) {
                    console.error("Error al realizar cierre:", error);
                    const message = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
                    showAlert('Error en Cierre', message);
                } finally {
                    setIsLoading(false);
                }
            }
        );
    };

    return (
        <div>
            <div className="flex items-center mb-6">
                <Link to="/dashboard/contabilidad" className="text-primary hover:underline">&larr; Volver a Contabilidad</Link>
            </div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Cierre Mensual de ITBIS</h1>
                <Button 
                    onClick={handleRealizarCierre}
                    disabled={isLoading || cierreExistente}
                >
                    {isLoading ? 'Procesando...' : (cierreExistente ? `Cierre de ${periodoSugerido} ya realizado` : `Realizar Cierre de ${periodoSugerido}`)}
                </Button>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Historial de Cierres de ITBIS</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Período</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Saldo a Favor Anterior</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">ITBIS en Ventas</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">ITBIS en Compras</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">ITBIS a Pagar</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Nuevo Saldo a Favor</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Fecha de Cierre</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {cierresITBIS.length === 0 ? (
                                    <tr><td colSpan={7} className="text-center py-4 text-secondary-500">No hay cierres registrados.</td></tr>
                                ) : (
                                    [...cierresITBIS].sort((a, b) => b.periodo.localeCompare(a.periodo)).map(cierre => (
                                        <tr key={cierre.id}>
                                            <td className="px-4 py-4 font-medium">{cierre.periodo}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(cierre.saldoInicial)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(cierre.itbisVentasMes)}</td>
                                            <td className="px-4 py-4 text-right">{formatCurrency(cierre.itbisComprasMes)}</td>
                                            <td className={`px-4 py-4 text-right font-semibold ${cierre.itbisAPagar > 0 ? 'text-red-600' : ''}`}>
                                                {formatCurrency(cierre.itbisAPagar)}
                                            </td>
                                            <td className={`px-4 py-4 text-right font-semibold ${cierre.saldoFinal > 0 ? 'text-green-600' : ''}`}>
                                                {formatCurrency(cierre.saldoFinal)}
                                            </td>
                                            <td className="px-4 py-4 text-sm">{new Date(cierre.fechaCierre).toLocaleString('es-DO')}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default CierreITBISPage;