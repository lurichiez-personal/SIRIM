import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClientUser } from '../types';

interface ClientAuthState {
  isClientAuthenticated: boolean;
  clientUser: ClientUser | null;
  clientUsers: ClientUser[];
  login: (user: ClientUser) => void;
  logout: () => void;
  triggerLogin: (email: string, password: string) => Promise<boolean>;
}

// Los usuarios cliente ahora vienen exclusivamente de la base de datos PostgreSQL

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set, get) => ({
      isClientAuthenticated: false,
      clientUser: null,
      clientUsers: [], // Los usuarios cliente se cargan dinámicamente desde la BD
      login: (user: ClientUser) => set({ isClientAuthenticated: true, clientUser: user }),
      logout: () => set({ isClientAuthenticated: false, clientUser: null }),
      triggerLogin: async (email: string, password: string) => {
        try {
          const cleanEmail = email.trim().toLowerCase();
          const cleanPassword = password.trim();
          
          // Intentar login con backend primero
          const response = await fetch('/api/client-auth/login', {
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
            
            if (result.clientUser && result.token) {
              // Guardar token del cliente
              localStorage.setItem('clientToken', result.token);
              
              // Login exitoso
              set({ isClientAuthenticated: true, clientUser: result.clientUser });
              return true;
            }
          }
          
          // Si el backend falla, intentar con usuarios locales como fallback
          const foundUser = get().clientUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
          
          if (foundUser && foundUser.password?.trim() === cleanPassword) {
              set({ isClientAuthenticated: true, clientUser: foundUser });
              return true;
          }
          
          return false;
        } catch (error) {
          console.error('Error en login de cliente:', error);
          
          // Fallback a usuarios locales
          const cleanEmail = email.trim().toLowerCase();
          const foundUser = get().clientUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
          
          if (foundUser && foundUser.password?.trim() === cleanPassword) {
              set({ isClientAuthenticated: true, clientUser: foundUser });
              return true;
          }
          
          return false;
        }
      },
    }),
    {
        name: 'sirim-client-auth-storage',
    }
  )
);