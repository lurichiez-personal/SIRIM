import React, { useState, useEffect, useMemo } from 'react';
import { NCFSequence, isNcfNotaCredito } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useNCFStore } from '../../stores/useNCFStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, InformationCircleIcon, ArchiveBoxXMarkIcon } from '../../components/icons/Icons';
import NCFSequenceModal from './NCFSequenceModal';
import { formatCurrency } from '../../utils/formatters';

const NCFPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { sequences, addSequence, subscribeToSequences, loading } = useNCFStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (selectedTenant) {
            const unsubscribe = subscribeToSequences(selectedTenant.id);
            return () => unsubscribe();
        }
    }, [selectedTenant, subscribeToSequences]);

    const handleSaveSequence = (sequenceData: Omit<NCFSequence, 'id' | 'empresaId' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => {
        if (!selectedTenant) return;
        addSequence(sequenceData);
    };

    const isExpired = (seq: NCFSequence) => {
        if (isNcfNotaCredito(seq.tipo)) return false;
        const today = new Date().toISOString().split('T')[0];
        return seq.fechaVencimiento < today;
    };

    const calculateProgress = (seq: NCFSequence) => {
        const total = seq.secuenciaHasta - seq.secuenciaDesde + 1;
        const used = seq.secuenciaActual - seq.secuenciaDesde;
        return Math.min(100, Math.max(0, (used / total) * 100));
    };

    const sortedSequences = useMemo(() => {
        return [...sequences].sort((a, b) => b.fechaVencimiento.localeCompare(a.fechaVencimiento));
    }, [sequences]);
    
    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestión de Secuencias NCF</h1>
                <Button leftIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
                    Añadir Secuencia
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Control de Comprobantes Fiscales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tipo / Autorización</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Rango Autorizado</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Próximo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Vigencia (Hasta)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Uso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {loading ? (
                                    <tr><td colSpan={6} className="text-center py-4">Cargando secuencias...</td></tr>
                                ) : sortedSequences.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay secuencias configuradas.</td></tr>
                                ) : (
                                    sortedSequences.map(seq => {
                                        const expired = isExpired(seq);
                                        const exhausted = seq.secuenciaActual > seq.secuenciaHasta;
                                        const isNota = isNcfNotaCredito(seq.tipo);
                                        const progress = calculateProgress(seq);

                                        return (
                                            <tr key={seq.id} className={expired ? 'bg-red-50/30' : ''}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-secondary-900">{seq.tipo}</div>
                                                    <div className="text-[10px] text-secondary-400 uppercase font-black">Ref: {seq.numeroSolicitud || 'N/A'}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary-600">
                                                    {`${seq.prefijo}${String(seq.secuenciaDesde).padStart(8, '0')} - ${seq.prefijo}${String(seq.secuenciaHasta).padStart(8, '0')}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-bold text-secondary-700">
                                                    {exhausted ? '---' : `${seq.prefijo}${String(seq.secuenciaActual).padStart(8, '0')}`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <div className={`font-semibold ${expired ? 'text-red-600' : 'text-secondary-700'}`}>
                                                        {isNota ? 'Sin Vencimiento' : new Date(seq.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-DO')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="w-32">
                                                        <div className="flex justify-between text-[10px] mb-1 font-bold text-secondary-500">
                                                            <span>{progress.toFixed(0)}%</span>
                                                            <span>{seq.secuenciaActual - seq.secuenciaDesde} / {seq.secuenciaHasta - seq.secuenciaDesde + 1}</span>
                                                        </div>
                                                        <div className="w-full bg-secondary-200 rounded-full h-1.5">
                                                            <div 
                                                                className={`h-1.5 rounded-full transition-all duration-500 ${
                                                                    expired ? 'bg-red-400' : (exhausted ? 'bg-secondary-400' : 'bg-primary')
                                                                }`} 
                                                                style={{ width: `${progress}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    <span className={`px-3 py-1 inline-flex text-[10px] leading-5 font-black uppercase rounded-full shadow-sm ${
                                                        expired ? 'bg-red-600 text-white' : 
                                                        (exhausted ? 'bg-secondary-200 text-secondary-700' : 
                                                        (isNota ? 'bg-green-100 text-green-800' : 'bg-green-600 text-white'))
                                                    }`}>
                                                        {expired ? 'Vencido' : (exhausted ? 'Agotado' : (isNota ? 'Válido' : 'En Uso'))}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center p-3 bg-blue-50 text-blue-800 rounded-md border border-blue-200 text-xs">
                    <InformationCircleIcon className="h-4 w-4 mr-2" />
                    <span>Los NCF vencen al 31 de Diciembre del año indicado en la autorización (Normativa DGII).</span>
                </div>
                <div className="flex items-center p-3 bg-red-50 text-red-800 rounded-md border border-red-200 text-xs font-bold">
                    <ArchiveBoxXMarkIcon className="h-4 w-4 mr-2" />
                    <span>Importante: Los comprobantes vencidos o agotados se bloquean automáticamente para evitar errores en su declaración.</span>
                </div>
            </div>

            <NCFSequenceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSequence}
            />
        </div>
    );
};

export default NCFPage;