
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
  getUsersForTenant: (empresaId: number) => Promise<User[]>;
  addUser: (userData: Omit<User, 'id'>) => Promise<void>;
  updateUser: (userData: User) => void;
  handleMicrosoftCallback: () => Promise<boolean>;
}

// Los usuarios ahora vienen exclusivamente de la base de datos PostgreSQL


export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      users: [], // Los usuarios se cargan dinámicamente desde la BD

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
        try {
          const cleanEmail = email.trim().toLowerCase();
          const cleanPassword = password.trim();
          
          // Detectar si es usuario master
          const isMasterUser = cleanEmail === 'lurichiez@gmail.com';
          const endpoint = isMasterUser ? '/api/master/login' : '/api/auth/login';
          
          console.log(`Intentando login con ${endpoint} para ${cleanEmail}`);
          
          // Intentar login con el endpoint correcto
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: cleanEmail,
              password: cleanPassword
            })
          });

          if (response.ok) {
            const result = await response.json();
            console.log('Login response:', result);
            
            if (result.user && result.token) {
              // Guardar token
              localStorage.setItem('token', result.token);
              
              // Crear objeto de usuario
              const user: User = {
                id: result.user.id.toString(),
                nombre: result.user.nombre,
                email: result.user.email,
                roles: isMasterUser ? [Role.Master] : [Role.Admin],
                authMethod: 'local',
                activo: true,
                empresaId: result.user.empresaId
              };
              
              // Login exitoso
              get().login(user);
              return true;
            }
          } else {
            const errorResult = await response.json();
            console.error("Error en respuesta del servidor:", errorResult);
          }
          
          console.error("Login fallido: Credenciales incorrectas.");
          return false;
        } catch (error) {
          console.error('Error en login:', error);
          return false;
        }
      },
      register: async (data) => {
        try {
          const { nombreEmpresa, rnc, nombreUsuario, email, password } = data;
          
          // Usar el endpoint del backend que guarda en PostgreSQL
          const response = await fetch('/api/registration/register-company', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              nombreEmpresa,
              rnc,
              nombreUsuario,
              email,
              password
            })
          });

          const result = await response.json();
          
          if (response.ok && result.message) {
            // El registro fue exitoso, crear usuario local para la sesión
            const newUser: User = {
              id: result.user.id.toString(),
              nombre: result.user.nombre,
              email: result.user.email,
              roles: [Role.Admin],
              empresaId: result.empresa.id,
              authMethod: 'local',
              activo: true,
            };
            
            // Agregar a usuarios locales y hacer login
            set(state => ({ users: [...state.users, newUser] }));
            get().login(newUser);
            
            useAlertStore.getState().showAlert(
              'Registro Exitoso', 
              `Empresa "${result.empresa.nombre}" creada exitosamente. Se ha enviado una notificación por email.`
            );
            
            return true;
          } else {
            useAlertStore.getState().showAlert('Error de Registro', result.error || 'Error en el registro');
            return false;
          }
        } catch (error) {
          console.error('Error en registro:', error);
          useAlertStore.getState().showAlert('Error de Conexión', 'No se pudo conectar con el servidor');
          return false;
        }
      },
      getUsersForTenant: async (empresaId: number) => {
        try {
          const response = await fetch(`/api/auth/users?empresaId=${empresaId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (response.ok) {
            const users = await response.json();
            return users;
          }
          
          // Fallback a datos locales si hay
          return get().users.filter(u => u.empresaId === empresaId);
        } catch (error) {
          console.error('Error obteniendo usuarios:', error);
          return get().users.filter(u => u.empresaId === empresaId);
        }
      },
      addUser: async (userData) => {
        try {
          // Verificar límites antes de enviar
          const existingUsers = await get().getUsersForTenant(userData.empresaId!);
          if (userData.roles.includes(Role.Admin)) {
            const adminsInCompany = existingUsers.filter(u => u.roles.includes(Role.Admin));
            if (adminsInCompany.length >= 3) {
                useAlertStore.getState().showAlert('Límite Alcanzado', 'Una empresa no puede tener más de 3 administradores.');
                return;
            }
          }

          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(userData)
          });

          if (response.ok) {
            const newUser = await response.json();
            // Agregar a la lista local también
            set(state => ({ users: [...state.users, newUser]}));
            useAlertStore.getState().showAlert('Usuario Creado', 'Usuario agregado exitosamente');
          } else {
            const error = await response.json();
            useAlertStore.getState().showAlert('Error', error.error || 'Error al crear usuario');
          }
        } catch (error) {
          console.error('Error creando usuario:', error);
          useAlertStore.getState().showAlert('Error de Conexión', 'No se pudo conectar con el servidor');
        }
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
