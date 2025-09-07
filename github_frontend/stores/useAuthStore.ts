
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Role } from '../types';
import { useTenantStore } from './useTenantStore';
import { useDataStore } from './useDataStore';
import { useAlertStore } from './useAlertStore';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  users: User[];
  login: (user: User) => void;
  logout: () => void;
  triggerMicrosoftLogin: () => boolean;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  register: (data: { nombreEmpresa: string, rnc: string, nombreUsuario: string, email: string, password: string }) => Promise<boolean>;
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


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      users: mockUsers,

      login: (user: User) => {
        set({ isAuthenticated: true, user });
        useTenantStore.getState().fetchAvailableTenants();
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
        useTenantStore.getState().clearTenants();
        useDataStore.getState().clearData();
      },
      triggerMicrosoftLogin: () => {
        console.log("Simulando login con Microsoft...");
        const microsoftUser = get().users.find(u => u.authMethod === 'microsoft' && u.roles.includes(Role.Contador));
        if (microsoftUser && microsoftUser.activo) {
            get().login(microsoftUser);
            return true;
        }
        const fallbackUser = get().users.find(u => u.authMethod === 'microsoft');
         if (fallbackUser && fallbackUser.activo) {
            get().login(fallbackUser);
            return true;
        }
        return false;
      },
      loginWithPassword: async (email, password) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        
        const foundUser = get().users.find(u => u.email.trim().toLowerCase() === cleanEmail && u.authMethod === 'local');
        
        if (foundUser && foundUser.password?.trim() === cleanPassword) {
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
      register: async (data) => {
        const { nombreEmpresa, rnc, nombreUsuario, email, password } = data;
        
        const existingUser = get().users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            useAlertStore.getState().showAlert('Error de Registro', 'El correo electrónico ya está en uso.');
            return false;
        }

        const newEmpresa = useTenantStore.getState().addEmpresa({ nombre: nombreEmpresa, rnc });

        const newUser: User = {
            id: `user-reg-${Date.now()}`,
            nombre: nombreUsuario,
            email: email,
            password: password,
            roles: [Role.Admin],
            empresaId: newEmpresa.id,
            authMethod: 'local',
            activo: true,
        };
        
        set(state => ({ users: [...state.users, newUser] }));
        
        get().login(newUser);

        return true;
      },
      getUsersForTenant: (empresaId: number) => {
        return get().users.filter(u => u.empresaId === empresaId);
      },
      addUser: (userData) => {
        const { users } = get();
        if (userData.roles.includes(Role.Admin)) {
            const adminsInCompany = users.filter(u => u.empresaId === userData.empresaId && u.roles.includes(Role.Admin));
            if (adminsInCompany.length >= 3) {
                useAlertStore.getState().showAlert('Límite Alcanzado', 'Una empresa no puede tener más de 3 administradores.');
                return;
            }
        }

        const newUser: User = { ...userData, id: `user-local-${Date.now()}`};
        set(state => ({ users: [...state.users, newUser]}));
      },
      updateUser: (userData) => {
        const { users } = get();
        if (userData.roles.includes(Role.Admin)) {
            const otherAdmins = users.filter(u => u.id !== userData.id && u.empresaId === userData.empresaId && u.roles.includes(Role.Admin));
            if (otherAdmins.length >= 3) {
                useAlertStore.getState().showAlert('Límite Alcanzado', 'Una empresa no puede tener más de 3 administradores.');
                return;
            }
        }

        set(state => ({
            users: state.users.map(u => u.id === userData.id ? userData : u)
        }));
      }
    }),
    {
      name: 'sirim-auth-storage', // unique name
    }
  )
);
