import { useAuthStore } from '../stores/useAuthStore.ts';
import { usePermissionsStore } from '../stores/usePermissionsStore.ts';
import { Permission } from '../types.ts';

export const usePermissions = () => {
  const { user } = useAuthStore();
  const { hasPermission: checkPermission } = usePermissionsStore();

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return checkPermission(user.roles, permission);
  };

  return { hasPermission };
};