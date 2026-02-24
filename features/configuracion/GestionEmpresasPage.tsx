import React, { useState } from 'react';
import { useTenantStore } from '../../stores/useTenantStore.ts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card.tsx';
import Button from '../../components/ui/Button.tsx';
import { PlusIcon } from '../../components/icons/Icons.tsx';
import NuevaEmpresaModal from './NuevaEmpresaModal.tsx';
import EditarEmpresaModal from './EditarEmpresaModal.tsx';
import { Empresa, CierreFiscalOptions } from '../../types.ts';

const GestionEmpresasPage: React.FC = () => {
    const { availableTenants, addEmpresa, updateTenant } = useTenantStore();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [empresaParaEditar, setEmpresaParaEditar] = useState<Empresa | null>(null);

    const handleSaveCreate = async (data: Omit<Empresa, 'id' | 'createdAt' | 'trialEndsAt' | 'logoUrl' | 'accentColor' | 'footerText' >) => {
        await addEmpresa(data);
    };

    const handleSaveUpdate = async (data: Empresa) => {
        await updateTenant(data);
    };

    const handleOpenEditModal = (empresa: Empresa) => {
        setEmpresaParaEditar(empresa);
        setIsEditModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestión de Empresas</h1>
                <Button leftIcon={<PlusIcon />} onClick={() => setIsCreateModalOpen(true)}>
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Cierre Fiscal</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {availableTenants.map(empresa => (
                                    <tr key={empresa.id}>
                                        <td className="px-6 py-4 font-medium">{empresa.nombre}</td>
                                        <td className="px-6 py-4">{empresa.rnc}</td>
                                        <td className="px-6 py-4">{CierreFiscalOptions[empresa.cierreFiscal] || empresa.cierreFiscal}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenEditModal(empresa)}>Editar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <NuevaEmpresaModal 
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSave={handleSaveCreate}
            />
            <EditarEmpresaModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveUpdate}
                empresaParaEditar={empresaParaEditar}
            />
        </div>
    );
};

export default GestionEmpresasPage;