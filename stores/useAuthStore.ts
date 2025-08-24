
import { create } from 'zustand';
import { User, Role } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  // TODO: Implementar el flujo de autenticación real con MSAL (Microsoft Authentication Library)
  triggerLogin: () => void;
}

const mockContadorUser: User = {
    id: 'user-contador-001',
    nombre: 'Contador Ejemplo',
    email: 'contador@example.com',
    roles: [Role.Contador],
};

const mockRegularUser: User = {
    id: 'user-regular-002',
    nombre: 'Usuario Operaciones',
    email: 'operaciones@empresa-a.com',
    roles: [Role.Operaciones],
    empresaId: 1
};

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false, // Iniciar como no autenticado
  user: null,
  login: (user: User) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
  triggerLogin: () => {
    // TODO: Aquí iría la lógica de redirección a Microsoft 365.
    // Por ahora, simulamos un login exitoso.
    // Para probar los dos roles, puedes cambiar cual de los dos usuarios se loguea.
    console.log("Simulando login con Microsoft...");
    setTimeout(() => {
        // Descomenta el usuario que quieras probar:
        // const loggedInUser = mockContadorUser;
        const loggedInUser = mockRegularUser;
        
        set({ isAuthenticated: true, user: loggedInUser });
    }, 1000);
  },
}));