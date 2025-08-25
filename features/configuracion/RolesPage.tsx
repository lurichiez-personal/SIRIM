
import React from 'react';
import { usePermissionsStore } from '../../stores/usePermissionsStore';
import { Role, Permission } from '../../types';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Checkbox from '../../components/ui/Checkbox';

const RolesPage: React.FC = () => {
    const { permissions, setPermission } = usePermissionsStore();
    const allRoles = Object.values(Role);
    const allPermissions = Object.values(Permission);

    return (
        <div>
            <h1 className="text-3xl font-bold text-secondary-800 mb-6">Gestión de Roles y Permisos</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Matriz de Permisos</CardTitle>
                    <p className="text-sm text-secondary-600 mt-1">
                        Active o desactive los permisos para cada rol de usuario. Los cambios se aplican en tiempo real.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-secondary-200 border">
                            <thead className="bg-secondary-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider sticky left-0 bg-secondary-50 z-10">
                                        Permiso
                                    </th>
                                    {allRoles.map(role => (
                                        <th key={role} className="px-6 py-3 text-center text-xs font-medium text-secondary-500 uppercase tracking-wider">
                                            {role}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-secondary-200">
                                {allPermissions.map(permission => (
                                    <tr key={permission}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900 sticky left-0 bg-white z-10">
                                            {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </td>
                                        {allRoles.map(role => (
                                            <td key={`${role}-${permission}`} className="px-6 py-4 whitespace-nowrap text-center">
                                                <Checkbox
                                                    checked={permissions[role]?.includes(permission) || false}
                                                    onChange={(checked) => setPermission(role, permission, checked)}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RolesPage;
