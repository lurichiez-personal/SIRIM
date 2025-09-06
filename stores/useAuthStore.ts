
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
  triggerMicrosoftLogin: () => Promise<boolean>;
  loginWithPassword: (email: string, password: string) => Promise<boolean>;
  register: (data: { nombreEmpresa: string, rnc: string, nombreUsuario: string, email: string, password: string }) => Promise<boolean>;
  getUsersForTenant: (empresaId: number) => User[];
  addUser: (userData: Omit<User, 'id'>) => void;
  updateUser: (userData: User) => void;
  handleMicrosoftCallback: () => Promise<boolean>;
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
      triggerMicrosoftLogin: async () => {
        console.log("Iniciando login con Microsoft...");
        
        try {
          // Importar dinámicamente para evitar problemas de SSR
          const { microsoftAuthService } = await import('../utils/microsoftAuth');
          
          // Cargar configuración
          const isConfigured = microsoftAuthService.loadConfiguration();
          
          if (!isConfigured || !microsoftAuthService.isReady()) {
            useAlertStore.getState().showAlert(
              'Microsoft Auth No Configurado',
              'Debe configurar las credenciales de Microsoft primero. Vaya a Configuración > Microsoft Office 365.'
            );
            return false;
          }

          // Verificar si ya hay un token válido
          if (microsoftAuthService.hasValidToken()) {
            // Intentar obtener información del usuario con token existente
            const tokenData = microsoftAuthService.getStoredToken();
            if (tokenData) {
              try {
                const userInfo = await microsoftAuthService.getUserInfo(tokenData.access_token);
                
                // Buscar o crear usuario basado en información de Microsoft
                const existingUser = get().users.find(u => 
                  u.email.toLowerCase() === userInfo.mail?.toLowerCase() ||
                  u.email.toLowerCase() === userInfo.userPrincipalName?.toLowerCase()
                );

                if (existingUser && existingUser.activo) {
                  get().login(existingUser);
                  return true;
                } else {
                  // Crear nuevo usuario si no existe
                  const newUser: User = {
                    id: `ms-${userInfo.id}`,
                    nombre: userInfo.displayName,
                    email: userInfo.mail || userInfo.userPrincipalName,
                    roles: [Role.Contador],
                    authMethod: 'microsoft',
                    activo: true
                  };
                  
                  set(state => ({ users: [...state.users, newUser] }));
                  get().login(newUser);
                  return true;
                }
              } catch (error) {
                console.error('Error con token existente:', error);
                // Token inválido, continuar con nuevo flujo de autenticación
              }
            }
          }

          // Iniciar proceso de autenticación (redirige a Microsoft)
          microsoftAuthService.startAuthentication();
          return true;
          
        } catch (error) {
          console.error('Error en Microsoft login:', error);
          useAlertStore.getState().showAlert(
            'Error de Autenticación',
            'No se pudo iniciar sesión con Microsoft. Verifique la configuración.'
          );
          return false;
        }
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
      },

      handleMicrosoftCallback: async () => {
        try {
          const { microsoftAuthService } = await import('../utils/microsoftAuth');
          
          const result = await microsoftAuthService.handleCallback();
          if (!result) {
            return false; // No hay callback de Microsoft
          }

          const { user: userInfo } = result;

          // Buscar usuario existente o crear nuevo
          let existingUser = get().users.find(u => 
            u.email.toLowerCase() === userInfo.mail?.toLowerCase() ||
            u.email.toLowerCase() === userInfo.userPrincipalName?.toLowerCase()
          );

          if (!existingUser) {
            // Crear nuevo usuario
            const newUser: User = {
              id: `ms-${userInfo.id}`,
              nombre: userInfo.displayName,
              email: userInfo.mail || userInfo.userPrincipalName,
              roles: [Role.Contador],
              authMethod: 'microsoft',
              activo: true
            };
            
            set(state => ({ users: [...state.users, newUser] }));
            existingUser = newUser;
          }

          if (existingUser.activo) {
            get().login(existingUser);
            return true;
          }

          return false;
        } catch (error) {
          console.error('Error procesando callback de Microsoft:', error);
          return false;
        }
      }
    }),
    {
      name: 'sirim-auth-storage', // unique name
    }
  )
);
