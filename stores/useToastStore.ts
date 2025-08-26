import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  showQuestion: (message: string, title?: string) => Promise<boolean>;
  
  // Confirmation modal state
  confirmModal: {
    isOpen: boolean;
    message: string;
    title?: string;
    resolve?: (value: boolean) => void;
  };
  setConfirmModal: (modal: ToastStore['confirmModal']) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  
  confirmModal: {
    isOpen: false,
    message: '',
    title: undefined,
    resolve: undefined,
  },
  
  setConfirmModal: (modal) => {
    set({ confirmModal: modal });
  },
  
  addToast: (toast) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Auto remove toast after duration
    if (toast.duration !== 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, toast.duration || 5000);
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
  
  clearAllToasts: () => {
    set({ toasts: [] });
  },
  
  showSuccess: (message) => {
    get().addToast({ message, type: 'success' });
  },
  
  showError: (message) => {
    get().addToast({ message, type: 'error' });
  },
  
  showWarning: (message) => {
    get().addToast({ message, type: 'warning' });
  },
  
  showInfo: (message) => {
    get().addToast({ message, type: 'info' });
  },
  
  showQuestion: (message, title = 'Confirmación') => {
    return new Promise<boolean>((resolve) => {
      set({
        confirmModal: {
          isOpen: true,
          message,
          title,
          resolve,
        }
      });
    });
  },
}));
