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

const mockClientUsers: ClientUser[] = [
    { id: 'client-user-1', clienteId: 1, nombre: 'Juan Perez (Cliente A)', email: 'clienteA@email.com', password: 'password123' },
    { id: 'client-user-2', clienteId: 2, nombre: 'Maria Gomez (Cliente B)', email: 'clienteB@email.com', password: 'password123' },
    { id: 'client-user-demo', clienteId: 1, nombre: 'Cliente A Corp (Demo)', email: 'cliente@demo.com', password: 'demo' },
];

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set, get) => ({
      isClientAuthenticated: false,
      clientUser: null,
      clientUsers: mockClientUsers,
      login: (user: ClientUser) => set({ isClientAuthenticated: true, clientUser: user }),
      logout: () => set({ isClientAuthenticated: false, clientUser: null }),
      triggerLogin: async (email: string, password: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const foundUser = get().clientUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);
        
        if (foundUser && foundUser.password?.trim() === cleanPassword) {
            set({ isClientAuthenticated: true, clientUser: foundUser });
            return true;
        }
        return false;
      },
    }),
    {
        name: 'sirim-client-auth-storage',
    }
  )
);