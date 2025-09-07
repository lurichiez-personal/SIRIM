import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { Role } from '../types';

const SmartRedirect = () => {
  const { user } = useAuthStore();

  // Redirect master users to their dedicated dashboard
  if (user && user.roles.includes(Role.Master)) {
    return <Navigate to="/master" replace />;
  }

  // All other users go to the regular dashboard
  return <Navigate to="/dashboard" replace />;
};

export default SmartRedirect;