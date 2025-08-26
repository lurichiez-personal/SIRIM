import React from 'react';
import { useToastStore } from '../../stores/useToastStore';
import ToastNotification from './ToastNotification';
import ConfirmModal from './ConfirmModal';

const ToastContainer: React.FC = () => {
  const { toasts, removeToast, confirmModal, setConfirmModal } = useToastStore();

  const handleConfirm = () => {
    if (confirmModal.resolve) {
      confirmModal.resolve(true);
    }
    setConfirmModal({
      isOpen: false,
      message: '',
      title: undefined,
      resolve: undefined,
    });
  };

  const handleCancel = () => {
    if (confirmModal.resolve) {
      confirmModal.resolve(false);
    }
    setConfirmModal({
      isOpen: false,
      message: '',
      title: undefined,
      resolve: undefined,
    });
  };

  return (
    <>
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <ToastNotification
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        variant="warning"
        confirmText="Confirmar"
        cancelText="Cancelar"
      />
    </>
  );
};

export default ToastContainer;
