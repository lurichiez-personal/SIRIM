import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Nomina, NominaStatus, Permission } from '../../types';
import Button from '../../components/ui/Button';
import Can from '../../components/Can';
import { useConfirmationStore } from '../../stores/useConfirmationStore';

const HistorialNominaPage: React.FC = () => {
    const { nominas, contabilizarNomina } = useDataStore();
    const navigate = useNavigate();
    const { showConfirmation } = useConfirmationStore();

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    const getStatusBadge = (status: NominaStatus) => {
        const map = {
            [NominaStatus.PendienteAuditoria]: 'bg-yellow-100 text-yellow-800',
            [NominaStatus.Auditada]: 'bg-blue-100 text-blue-800',
            [NominaStatus.Contabilizada]: 'bg-green-100 text-green-800',
        };
        return map[status] || 'bg-secondary-100 text-secondary-800';
    };
    
    const handleContabilizar = (nominaId: string) => {
        showConfirmation(
            'Confirmar Contabilización',
            '¿Está seguro de que desea contabilizar esta nómina? Esta acción generará el asiento contable y no se puede revertir.',
            () => contabilizarNomina(nominaId)
        );
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Historial de Nóminas</h1>
            <Card>
                <CardHeader><CardTitle>Nóminas Procesadas</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Período</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Generado Por</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Auditado Por</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Total Pagado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {nominas.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4">No hay nóminas en el historial.</td></tr>
                                ) : (
                                    [...nominas].sort((a,b) => b.periodo.localeCompare(a.periodo)).map(nomina => (
                                        <tr key={nomina.id}>
                                            <td className="px-6 py-4 font-medium">{nomina.periodo}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(nomina.status)}`}>
                                                    {nomina.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm">{nomina.generadoPor.userName}</td>
                                            <td className="px-6 py-4 text-sm">{nomina.auditadoPor?.userName || 'N/A'}</td>
                                            <td className="px-6 py-4 text-right font-semibold">{formatCurrency(nomina.totalPagado)}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {nomina.status === NominaStatus.PendienteAuditoria && (
                                                    <Can I={Permission.AUDITAR_NOMINA}>
                                                        <Button size="sm" onClick={() => navigate(`/nomina/auditar/${nomina.id}`)}>Auditar</Button>
                                                    </Can>
                                                )}
                                                {nomina.status === NominaStatus.Auditada && (
                                                    <Can I={Permission.CONTABILIZAR_NOMINA}>
                                                        <Button size="sm" onClick={() => handleContabilizar(nomina.id)}>Contabilizar</Button>
                                                    </Can>
                                                )}
                                                {nomina.status === NominaStatus.Contabilizada && (
                                                    <Button size="sm" variant="secondary" onClick={() => navigate(`/nomina/auditar/${nomina.id}`)}>Ver Detalles</Button>
                                                )}
                                            </td>
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

export default HistorialNominaPage;