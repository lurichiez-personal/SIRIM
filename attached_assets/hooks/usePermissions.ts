
import { useAuthStore } from '../stores/useAuthStore';
import { usePermissionsStore } from '../stores/usePermissionsStore';
import { Permission } from '../types';

export const usePermissions = () => {
  const { user } = useAuthStore();
  const { hasPermission: checkPermission } = usePermissionsStore();

  const hasPermission = (permission: Permission) => {
    if (!user) return false;
    return checkPermission(user.roles, permission);
  };

  return { hasPermission };
};
