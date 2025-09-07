
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
        if (selectedTenant && user?.roles?.includes(Role.Master)) {
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

    const handleSaveUser = async (userData: any) => {
        if (!selectedTenant) return;
        
        try {
            setError(null);
            
            if ('id' in userData) {
                // Actualizar usuario existente
                await apiClient.updateEmpresaUser(selectedTenant.id, userData.id, userData);
            } else {
                // Crear nuevo usuario
                await apiClient.createEmpresaUser(selectedTenant.id, userData);
            }
            
            // Recargar lista de usuarios
            await loadTenantUsers();
            setIsModalOpen(false);
            setUserToEdit(null);
        } catch (err) {
            console.error('Error guardando usuario:', err);
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    };
    
    const handleOpenModalParaCrear = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenModalParaEditar = (userEmpresa: any) => {
        // Transformar datos del backend al formato esperado por el modal
        const userForEdit = {
            id: userEmpresa.userId,
            nombre: userEmpresa.user.nombre,
            email: userEmpresa.user.email,
            companyRole: userEmpresa.role,
            active: userEmpresa.active,
            globalRole: userEmpresa.user.role
        };
        setUserToEdit(userForEdit);
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
                    {loading && (
                        <div className="text-center py-8">
                            <p className="text-secondary-600">Cargando usuarios...</p>
                        </div>
                    )}
                    
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                            <p className="text-red-600">{error}</p>
                        </div>
                    )}
                    
                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-secondary-200">
                                <thead className="bg-secondary-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Nombre</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase">Estado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-secondary-200">
                                    {tenantUsers.map(userEmpresa => (
                                        <tr key={`${userEmpresa.userId}-${userEmpresa.empresaId}`}>
                                            <td className="px-6 py-4 font-medium">{userEmpresa.user.nombre}</td>
                                            <td className="px-6 py-4">{userEmpresa.user.email}</td>
                                            <td className="px-6 py-4">{userEmpresa.role}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${userEmpresa.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {userEmpresa.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(userEmpresa)}>Editar</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    
                                    {tenantUsers.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-secondary-500">
                                                No hay usuarios en esta empresa
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
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
