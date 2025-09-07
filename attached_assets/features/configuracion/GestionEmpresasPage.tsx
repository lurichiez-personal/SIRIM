import React, { useState } from 'react';
import { useTenantStore } from '../../stores/useTenantStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon } from '../../components/icons/Icons';
import NuevaEmpresaModal from './NuevaEmpresaModal';

const GestionEmpresasPage: React.FC = () => {
    const { availableTenants, addEmpresa } = useTenantStore();
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestión de Empresas</h1>
                <Button leftIcon={<PlusIcon />} onClick={() => setIsModalOpen(true)}>
                    Nueva Empresa
                </Button>
            </div>
            <Card>
                <CardHeader><CardTitle>Empresas en el Sistema</CardTitle></CardHeader>
                <CardContent>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">RNC</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {availableTenants.map(empresa => (
                                    <tr key={empresa.id}>
                                        <td className="px-6 py-4 font-medium">{empresa.nombre}</td>
                                        <td className="px-6 py-4">{empresa.rnc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <NuevaEmpresaModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={addEmpresa}
            />
        </div>
    );
};

export default GestionEmpresasPage;