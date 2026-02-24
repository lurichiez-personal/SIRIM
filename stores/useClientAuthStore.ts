import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ClientUser } from '../types';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

interface ClientAuthState {
  isClientAuthenticated: boolean;
  clientUser: ClientUser | null;
  login: (user: ClientUser) => void;
  logout: () => void;
  triggerLogin: (email: string, password: string) => Promise<boolean>;
}

// In a real app, client user data would be fetched from Firestore after login
const mockClientUsers: ClientUser[] = [
    { id: 'client-user-1', clienteId: '1', nombre: 'Juan Perez (Cliente A)', email: 'clienteA@email.com' },
    { id: 'client-user-2', clienteId: '2', nombre: 'Maria Gomez (Cliente B)', email: 'clienteB@email.com' },
    { id: 'client-user-demo', clienteId: '1', nombre: 'Cliente A Corp (Demo)', email: 'cliente@demo.com' },
];

export const useClientAuthStore = create<ClientAuthState>()(
  persist(
    (set, get) => ({
      isClientAuthenticated: false,
      clientUser: null,
      login: (user: ClientUser) => set({ isClientAuthenticated: true, clientUser: user }),
      logout: () => {
        // Since we are using the same Firebase auth instance, logging out here will log out the main user too.
        // In a real multi-auth scenario, this would need careful handling. For now, we just clear local state.
        set({ isClientAuthenticated: false, clientUser: null });
      },
      triggerLogin: async (email: string, password: string) => {
        // This simulates a login against a predefined set of client users
        // A real implementation would involve checking roles or a separate user collection in Firestore
        // For this demo, we check if the email exists in our mock client list and use a hardcoded password.
        const cleanEmail = email.trim().toLowerCase();
        
        const foundMockUser = mockClientUsers.find(u => u.email.trim().toLowerCase() === cleanEmail);

        if (foundMockUser && password === 'demo') {
            // This does not actually sign in with Firebase, just sets local state for the portal
            set({ isClientAuthenticated: true, clientUser: foundMockUser });
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
