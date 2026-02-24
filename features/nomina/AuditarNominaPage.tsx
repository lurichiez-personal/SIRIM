import React, { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDataStore } from '../../stores/useDataStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import { Nomina, NominaStatus, Permission } from '../../types.ts';
import Button from '../../components/ui/Button.tsx';
import Can from '../../components/Can.tsx';
import { useConfirmationStore } from '../../stores/useConfirmationStore.ts';

const AuditarNominaPage: React.FC = () => {
    const { nominaId } = useParams<{ nominaId: string }>();
    const navigate = useNavigate();
    const { getNominaById, auditarNomina, deleteNomina } = useDataStore();
    const { showConfirmation } = useConfirmationStore();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nomina = useMemo(() => {
        if (!nominaId) return null;
        return getNominaById(nominaId);
    }, [nominaId, getNominaById]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(value);

    if (!nomina) {
        return (
            <div>
                <h1 className="text-3xl font-bold text-secondary-800 mb-6">Nómina no encontrada</h1>
                <p>No se pudo encontrar la nómina solicitada. <Link to="/dashboard/nomina/historial" className="text-primary hover:underline">Volver al historial</Link>.</p>
            </div>
        );
    }
    
    const handleAprobar = async () => {
        setIsSubmitting(true);
        try {
            await auditarNomina(nomina.id);
            navigate('/dashboard/nomina/historial');
        } catch (error) {
            console.error("Error al aprobar la nómina:", error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleRechazar = () => {
        showConfirmation(
            'Confirmar Rechazo',
            `¿Está seguro de que desea rechazar y eliminar la nómina del período ${nomina.periodo}? Deberá generarla de nuevo.`,
            async () => {
                setIsSubmitting(true);
                try {
                    await deleteNomina(nomina.id);
                    navigate('/dashboard/nomina/historial');
                } catch (error) {
                    // El error es manejado y mostrado por la alerta del data store
                    console.error("Error al rechazar la nómina:", error);
                } finally {
                    setIsSubmitting(false);
                }
            }
        );
    };

    const totals = {
        bruto: nomina.empleados.reduce((sum, e) => sum + e.salarioBruto, 0),
        deducciones: nomina.empleados.reduce((sum, e) => sum + e.totalDeduccionesEmpleado, 0),
        aportes: nomina.empleados.reduce((sum, e) => sum + e.totalAportesEmpleador, 0),
        neto: nomina.totalPagado,
        costoTotal: nomina.totalCostoEmpresa,
    };
    
    return (
        <div>
            <div className="flex items-center mb-4">
                <Link to="/dashboard/nomina/historial" className="text-primary hover:underline">&larr; Volver al Historial de Nóminas</Link>
            </div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-2">Auditoría de Nómina - Período {nomina.periodo}</h1>
            <p className="text-secondary-600 mb-6">Revisa los cálculos y detalles antes de aprobar para la contabilización y el pago.</p>
            
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                    <CardHeader><CardTitle>Total a Pagar (Neto)</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-primary">{formatCurrency(totals.neto)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Costo Total para la Empresa</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(totals.costoTotal)}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Total Retenciones y Aportes</CardTitle></CardHeader>
                    <CardContent><p className="text-2xl font-bold text-yellow-600">{formatCurrency(totals.deducciones + totals.aportes)}</p></CardContent>
                </Card>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Desglose por Empleado</CardTitle>
                </CardHeader>
                <CardContent>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200 text-sm">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium text-secondary-500">Empleado</th>
                                    <th className="px-3 py-2 text-right font-medium text-secondary-500">Salario Bruto</th>
                                    <th className="px-3 py-2 text-right font-medium text-secondary-500">Deducciones</th>
                                    <th className="px-3 py-2 text-right font-medium text-secondary-500">Salario Neto</th>
                                    <th className="px-3 py-2 text-right font-medium text-secondary-500">Aportes Empresa</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {nomina.empleados.map(emp => (
                                    <tr key={emp.empleadoId}>
                                        <td className="px-3 py-3 font-medium">{emp.nombre}</td>
                                        <td className="px-3 py-3 text-right">{formatCurrency(emp.salarioBruto)}</td>
                                        <td className="px-3 py-3 text-right text-red-600">({formatCurrency(emp.totalDeduccionesEmpleado)})</td>
                                        <td className="px-3 py-3 text-right font-bold text-primary">{formatCurrency(emp.salarioNeto)}</td>
                                        <td className="px-3 py-3 text-right text-blue-600">{formatCurrency(emp.totalAportesEmpleador)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-secondary-50 font-bold">
                                <tr>
                                    <td className="px-3 py-2 text-left">TOTALES</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(totals.bruto)}</td>
                                    <td className="px-3 py-2 text-right text-red-600">({formatCurrency(totals.deducciones)})</td>
                                    <td className="px-3 py-2 text-right text-primary">{formatCurrency(totals.neto)}</td>
                                    <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(totals.aportes)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-sm text-secondary-600">
                <p><span className="font-semibold">Generado por:</span> {nomina.generadoPor.userName} el {new Date(nomina.fechaGeneracion).toLocaleString('es-DO')}</p>
                {nomina.auditadoPor && <p><span className="font-semibold">Auditado por:</span> {nomina.auditadoPor.userName} el {new Date(nomina.fechaAuditoria!).toLocaleString('es-DO')}</p>}
                {nomina.contabilizadoPor && <p><span className="font-semibold">Contabilizado por:</span> {nomina.contabilizadoPor.userName} el {new Date(nomina.fechaContabilizacion!).toLocaleString('es-DO')}</p>}
            </div>

            {nomina.status === NominaStatus.PendienteAuditoria && (
                 <Can I={Permission.AUDITAR_NOMINA}>
                    <div className="mt-8 flex justify-end space-x-4">
                        <Button size="md" variant="danger" onClick={handleRechazar} disabled={isSubmitting}>
                            {isSubmitting ? 'Procesando...' : 'Rechazar y Eliminar'}
                        </Button>
                        <Button size="md" onClick={handleAprobar} disabled={isSubmitting}>
                            {isSubmitting ? 'Procesando...' : 'Aprobar Nómina'}
                        </Button>
                    </div>
                </Can>
            )}
        </div>
    );
};

export default AuditarNominaPage;