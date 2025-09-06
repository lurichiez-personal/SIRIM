import { create } from 'zustand';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  showConfirmation: (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => void;
  hideConfirmation: () => void;
}

export const useConfirmationStore = create<ConfirmationState>((set) => ({
  isOpen: false,
  title: '',
  message: '',
  onConfirm: () => {},
  onCancel: () => {},
  showConfirmation: (title, message, onConfirm, onCancel) => {
    set({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        set({ isOpen: false });
      },
      onCancel: () => {
        if (onCancel) onCancel();
        set({ isOpen: false });
      },
    });
  },
  hideConfirmation: () => set({ isOpen: false }),
}));
