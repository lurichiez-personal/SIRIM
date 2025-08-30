import { create } from 'zustand';
import { User, Role } from '../types';
import { useTenantStore } from './useTenantStore';
import { useDataStore } from './useDataStore';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  login: (user: User) => void;
  logout: () => void;
  triggerMicrosoftLogin: () => boolean;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  getUsersForTenant: (empresaId: number) => User[];
  addUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (userData: User) => void;
}

const mockUsers: User[] = [
    { id: 'user-master-001', nombre: 'Luis Richiez', email: 'lurichiez@gmail.com', roles: [Role.Contador], authMethod: 'local', password: 'Alonso260990#', activo: true },
    { id: 'user-contador-001', nombre: 'Contador General', email: 'contador@sirim.com', roles: [Role.Contador], authMethod: 'microsoft', activo: true },
    { id: 'user-admin-empresa-a', nombre: 'Admin Empresa A', email: 'admin@empresa-a.com', roles: [Role.Admin], empresaId: 1, authMethod: 'local', password: 'password123', activo: true },
    { id: 'user-ops-empresa-a', nombre: 'Usuario Operaciones A', email: 'operaciones@empresa-a.com', roles: [Role.Operaciones], empresaId: 1, authMethod: 'microsoft', activo: true },
    { id: 'user-admin-empresa-b', nombre: 'Admin Empresa B', email: 'admin@empresa-b.com', roles: [Role.Admin], empresaId: 2, authMethod: 'local', password: 'password123', activo: true },
    { id: 'user-ops-empresa-b', nombre: 'Usuario Operaciones B', email: 'operaciones@empresa-b.com', roles: [Role.Operaciones], empresaId: 2, authMethod: 'local', password: 'password123', activo: false },
];


export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  user: null,
  users: mockUsers,

  login: (user: User) => {
    set({ isAuthenticated: true, user });
    useTenantStore.getState().fetchAvailableTenants();
  },
  logout: () => {
    set({ isAuthenticated: false, user: null });
    // Orchestrate state clearing from here
    useTenantStore.getState().clearTenants();
    useDataStore.getState().clearData();
  },
  triggerMicrosoftLogin: () => {
    console.log("Simulando login con Microsoft...");
    // Simula encontrar el usuario Contador de Microsoft y loguearlo
    const microsoftUser = get().users.find(u => u.authMethod === 'microsoft' && u.roles.includes(Role.Contador));
    if (microsoftUser && microsoftUser.activo) {
        get().login(microsoftUser);
        return true;
    }
    // Fallback por si el contador no está o no es de MS, para que el botón siga funcionando.
    const fallbackUser = get().users.find(u => u.authMethod === 'microsoft');
     if (fallbackUser && fallbackUser.activo) {
        get().login(fallbackUser);
        return true;
    }
    return false;
  },
  loginWithPassword: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular latencia
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const foundUser = get().users.find(u => u.email.toLowerCase() === cleanEmail && u.authMethod === 'local');
    
    if (foundUser && foundUser.password === cleanPassword) {
        if (!foundUser.activo) {
            console.error("Login fallido: Usuario inactivo.");
            return false;
        }
        get().login(foundUser);
        return true;
    }
    console.error("Login fallido: Credenciales incorrectas.");
    return false;
  },
  getUsersForTenant: (empresaId: number) => {
    return get().users.filter(u => u.empresaId === empresaId);
  },
  addUser: (userData) => {
    const newUser: User = { ...userData, id: `user-local-${Date.now()}`};
    set(state => ({ users: [...state.users, newUser]}));
  },
  updateUser: (userData) => {
    set(state => ({
        users: state.users.map(u => u.id === userData.id ? userData : u)
    }));
  }
}));
