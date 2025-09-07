

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Role, Permission, RolePermissions } from '../types';

interface PermissionsState {
  permissions: RolePermissions;
  hasPermission: (roles: Role[], permission: Permission) => boolean;
  setPermission: (role: Role, permission: Permission, granted: boolean) => void;
}

const defaultPermissions: RolePermissions = {
    [Role.Admin]: [
        Permission.VER_DASHBOARD, Permission.GESTIONAR_CLIENTES, Permission.GESTIONAR_FACTURAS,
        Permission.GESTIONAR_COTIZACIONES, Permission.GESTIONAR_NOTAS, Permission.GESTIONAR_GASTOS,
        Permission.GESTIONAR_PAGOS, Permission.GESTIONAR_INVENTARIO, Permission.GESTIONAR_CONCILIACION,
        Permission.VER_REPORTES_DGII, Permission.GESTIONAR_CONFIGURACION_EMPRESA, Permission.GESTIONAR_USUARIOS,
        Permission.GESTIONAR_NOMINA, Permission.AUDITAR_NOMINA, Permission.CONTABILIZAR_NOMINA,
        Permission.GESTIONAR_DESVINCULACIONES, Permission.VER_HISTORIAL_DESVINCULACIONES, 
        Permission.GESTIONAR_CONTABILIDAD, Permission.GESTIONAR_CATALOGO_CUENTAS, Permission.VER_REPORTES_FINANCIEROS,
    ],
    [Role.Contador]: Object.values(Permission), // Contador (Master User) can do everything
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
    [Role.GerenteRRHH]: [
        Permission.VER_DASHBOARD,
        Permission.GESTIONAR_NOMINA,
        Permission.GESTIONAR_DESVINCULACIONES,
        Permission.VER_HISTORIAL_DESVINCULACIONES,
    ],
    [Role.AuditorNomina]: [
        Permission.VER_DASHBOARD,
        Permission.GESTIONAR_NOMINA, // To view employees and history
        Permission.AUDITAR_NOMINA,
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
