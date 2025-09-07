
import React, { useState, useEffect } from 'react';
import { NCFSequence } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useNCFStore } from '../../stores/useNCFStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon } from '../../components/icons/Icons';
import NCFSequenceModal from './NCFSequenceModal';

const NCFPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { sequences, addSequence } = useNCFStore();
    const [tenantSequences, setTenantSequences] = useState<NCFSequence[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (selectedTenant) {
            const filteredSequences = sequences.filter(s => s.empresaId === selectedTenant.id);
            setTenantSequences(filteredSequences);
        }
    }, [selectedTenant, sequences]);

    const handleSaveSequence = (sequenceData: Omit<NCFSequence, 'id' | 'empresaId' | 'secuenciaActual' | 'activa' | 'alertaActiva'>) => {
        if (!selectedTenant) return;
        addSequence({ ...sequenceData, empresaId: selectedTenant.id });
    };

    const calculateProgress = (seq: NCFSequence) => {
        const total = seq.secuenciaHasta - seq.secuenciaDesde + 1;
        const used = seq.secuenciaActual - seq.secuenciaDesde;
        return (used / total) * 100;
    };
    
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
                    <CardTitle>Secuencias de Comprobantes Fiscales</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Tipo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Rango</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Próximo a usar</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Vigencia</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Uso</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {tenantSequences.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center py-4 text-secondary-500">No hay secuencias configuradas para esta empresa.</td></tr>
                                ) : (
                                    tenantSequences.map(seq => (
                                        <tr key={seq.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900">{seq.tipo}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{`${seq.prefijo}${String(seq.secuenciaDesde).padStart(8, '0')} - ${seq.prefijo}${String(seq.secuenciaHasta).padStart(8, '0')}`}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500 font-mono">{seq.secuenciaActual > seq.secuenciaHasta ? 'Agotado' : seq.secuenciaActual}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{new Date(seq.fechaVencimiento).toLocaleDateString('es-DO')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">
                                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                    <div className={`h-2.5 rounded-full ${seq.alertaActiva ? 'bg-red-500' : 'bg-primary'}`} style={{ width: `${calculateProgress(seq)}%` }}></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${seq.activa ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {seq.activa ? 'Activa' : 'Inactiva'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <NCFSequenceModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveSequence}
            />
        </div>
    );
};

export default NCFPage;
