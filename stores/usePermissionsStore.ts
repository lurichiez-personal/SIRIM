
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, Permission, RolePermissions } from '../types';

interface PermissionsState {
  permissions: RolePermissions;
  hasPermission: (roles: Role[], permission: Permission) => boolean;
  setPermission: (role: Role, permission: Permission, granted: boolean) => void;
}

const defaultPermissions: RolePermissions = {
    [Role.Admin]: Object.values(Permission), // Admin can do everything
    [Role.Contador]: [
        Permission.VER_DASHBOARD, Permission.GESTIONAR_CLIENTES, Permission.GESTIONAR_FACTURAS,
        Permission.GESTIONAR_COTIZACIONES, Permission.GESTIONAR_NOTAS, Permission.GESTIONAR_GASTOS,
        Permission.GESTIONAR_PAGOS, Permission.GESTIONAR_INVENTARIO, Permission.GESTIONAR_CONCILIACION,
        Permission.VER_REPORTES_DGII, Permission.GESTIONAR_CONFIGURACION_EMPRESA, Permission.GESTIONAR_ROLES, Permission.GESTIONAR_USUARIOS
    ],
    [Role.Operaciones]: [
        Permission.VER_DASHBOARD, Permission.GESTIONAR_CLIENTES, Permission.GESTIONAR_FACTURAS,
        Permission.GESTIONAR_COTIZACIONES, Permission.GESTIONAR_GASTOS, Permission.GESTIONAR_PAGOS,
        Permission.GESTIONAR_INVENTARIO, Permission.GESTIONAR_CONFIGURACION_EMPRESA,
    ],
    [Role.Aprobador]: [
        Permission.VER_DASHBOARD, Permission.GESTIONAR_GASTOS,
    ],
    [Role.Usuario]: [
        Permission.VER_DASHBOARD,
    ],
};

export const usePermissionsStore = create<PermissionsState>()(
  persist(
    (set, get) => ({
      permissions: defaultPermissions,
      hasPermission: (roles, permissionToCheck) => {
        if (!roles) return false;
        return roles.some(role => get().permissions[role]?.includes(permissionToCheck));
      },
      setPermission: (role, permission, granted) => {
        set(state => {
          const rolePermissions = new Set(state.permissions[role] || []);
          if (granted) {
            rolePermissions.add(permission);
          } else {
            rolePermissions.delete(permission);
          }
          return {
            permissions: {
              ...state.permissions,
              [role]: Array.from(rolePermissions),
            },
          };
        });
      },
    }),
    {
      name: 'sirim-permissions-storage',
    }
  )
);
