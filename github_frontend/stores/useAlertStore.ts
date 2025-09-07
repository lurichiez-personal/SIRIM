
import { create } from 'zustand';

interface AlertState {
  isOpen: boolean;
  title: string;
  message: string;
  showAlert: (title: string, message: string) => void;
  closeAlert: () => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  showAlert: (title, message) => set({ isOpen: true, title, message }),
  closeAlert: () => set({ isOpen: false, title: '', message: '' }),
}));
