
import React from 'react';
import { useAlertStore } from '../../stores/useAlertStore';
import { InformationCircleIcon } from '../icons/Icons';
import Button from './Button';

const AlertModal: React.FC = () => {
  const { isOpen, title, message, closeAlert } = useAlertStore();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex justify-center items-center"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm m-4 p-6 text-center"
      >
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary-100">
            <InformationCircleIcon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg leading-6 font-medium text-secondary-900 mt-4">{title}</h3>
        <div className="mt-2">
            <p className="text-sm text-secondary-600">{message}</p>
        </div>
        <div className="mt-6">
            <Button onClick={closeAlert} className="w-full">
                Entendido
            </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
