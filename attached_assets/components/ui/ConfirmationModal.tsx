import React from 'react';
import { useConfirmationStore } from '../../stores/useConfirmationStore';
import Button from './Button';

const ConfirmationModal: React.FC = () => {
  const { isOpen, title, message, onConfirm, onCancel } = useConfirmationStore();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm m-4 p-6">
        <h3 className="text-lg leading-6 font-medium text-secondary-900">{title}</h3>
        <div className="mt-2">
          <p className="text-sm text-secondary-600">{message}</p>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirmar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
