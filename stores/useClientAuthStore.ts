
import { create } from 'zustand';
import { ClientUser } from '../types';

interface ClientAuthState {
  isClientAuthenticated: boolean;
  clientUser: ClientUser | null;
  login: (user: ClientUser) => void;
  logout: () => void;
  triggerLogin: (email: string) => Promise<boolean>;
}

const mockClientUsers: ClientUser[] = [
    { id: 'client-user-1', clienteId: 1, nombre: 'Juan Perez (Cliente A)', email: 'clienteA@email.com' },
    { id: 'client-user-2', clienteId: 2, nombre: 'Maria Gomez (Cliente B)', email: 'clienteB@email.com' },
];

export const useClientAuthStore = create<ClientAuthState>((set) => ({
  isClientAuthenticated: false,
  clientUser: null,
  login: (user: ClientUser) => set({ isClientAuthenticated: true, clientUser: user }),
  logout: () => set({ isClientAuthenticated: false, clientUser: null }),
  triggerLogin: async (email: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const foundUser = mockClientUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
        set({ isClientAuthenticated: true, clientUser: foundUser });
        return true;
    }
    return false;
  },
}));
