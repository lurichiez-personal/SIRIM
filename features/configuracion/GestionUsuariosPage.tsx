import React, { useState, useEffect } from 'react';
import { User, Role, Permission } from '../../types';
import { useTenantStore } from '../../stores/useTenantStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { PlusIcon, TrashIcon } from '../../components/icons/Icons';
import NuevoUsuarioModal from './NuevoUsuarioModal';
import Can from '../../components/Can';
import { useConfirmationStore } from '../../stores/useConfirmationStore';

const GestionUsuariosPage: React.FC = () => {
    const { selectedTenant } = useTenantStore();
    const { getUsersForTenant, addUser, updateUser, deleteUser } = useAuthStore();
    const { showConfirmation } = useConfirmationStore();
    const [tenantUsers, setTenantUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            if (selectedTenant) {
                setLoading(true);
                const users = await getUsersForTenant(selectedTenant.id);
                setTenantUsers(users);
                setLoading(false);
            }
        };
        fetchUsers();
    }, [selectedTenant, getUsersForTenant]);

    const handleSaveUser = async (data: { user: Omit<User, 'id'> | User, password?: string }) => {
        if ('id' in data.user) { // Edit mode
            await updateUser(data.user as User, data.password);
        } else { // Create mode
            if (selectedTenant) {
                // The modal now provides the complete user object, including empresaId.
                await addUser(data.user as Omit<User, 'id'>, data.password!);
            }
        }
        // Refetch users
        if (selectedTenant) {
            setTenantUsers(await getUsersForTenant(selectedTenant.id));
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

    const handleDeleteUser = (user: User) => {
        showConfirmation(
            'Confirmar Eliminación Permanente',
            `¿Está seguro de que desea eliminar permanentemente al usuario ${user.nombre}? Se eliminará su perfil de la base de datos y no podrá volver a acceder al sistema. Esta acción no se puede deshacer.`,
            async () => {
                await deleteUser(user);
                if (selectedTenant) {
                    setTenantUsers(await getUsersForTenant(selectedTenant.id));
                }
            }
        );
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
                                {loading ? (
                                    <tr><td colSpan={5} className="text-center py-4">Cargando usuarios...</td></tr>
                                ) : (
                                    tenantUsers.map(user => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 font-medium">{user.nombre}</td>
                                            <td className="px-6 py-4">{user.email}</td>
                                            <td className="px-6 py-4">{user.roles.join(', ')}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {user.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleOpenModalParaEditar(user)}>Editar</Button>
                                                <Can I={Permission.ELIMINAR_USUARIOS}>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteUser(user)} title="Eliminar Usuario">
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </Can>
                                            </td>
                                        </tr>
                                    ))
                                )}
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
                empresaId={selectedTenant?.id}
            />
        </div>
    );
};

export default GestionUsuariosPage;
