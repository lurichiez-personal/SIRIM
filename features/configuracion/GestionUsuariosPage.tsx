
import React, { useState, useEffect } from 'react';
import { User, Role } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon } from '../../components/icons/Icons';
import NuevoUsuarioModal from './NuevoUsuarioModal';
import { apiClient } from '../../services/apiClient';

const GestionUsuariosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { user } = useAuthStore();
    const [tenantUsers, setTenantUsers] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (selectedTenant && user?.roles?.includes('master')) {
            loadTenantUsers();
        }
    }, [selectedTenant, user]);

    const loadTenantUsers = async () => {
        if (!selectedTenant) return;
        
        try {
            setLoading(true);
            setError(null);
            const response = await apiClient.getEmpresaUsers(selectedTenant.id);
            
            if (response.error) {
                throw new Error(response.error);
            }
            
            setTenantUsers(response || []);
        } catch (err) {
            console.error('Error cargando usuarios:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
            setTenantUsers([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = (userData: Omit<User, 'id'> | User) => {
        if ('id' in userData) {
            updateUser(userData);
        } else {
            if (selectedTenant) {
                addUser({ ...userData, empresaId: selectedTenant.id });
            }
        }
    };
    
    const handleOpenModalParaCrear = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (user: User) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-secondary-800">Gestión de Usuarios</h1>
                <Button leftIcon={<PlusIcon />} onClick={handleOpenModalParaCrear}>
                    Nuevo Usuario
                </Button>
            </div>
            <Card>
                <CardHeader><CardTitle>Usuarios de {selectedTenant?.nombre}</CardTitle></CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Roles</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {tenantUsers.map(user => (
                                    <tr key={user.id}>
                                        <td className="px-6 py-4 font-medium">{user.nombre}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4">{user.roles.join(', ')}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(user)}>Editar</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
            <NuevoUsuarioModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveUser}
                userToEdit={userToEdit}
            />
        </div>
    );
};

export default GestionUsuariosPage;
