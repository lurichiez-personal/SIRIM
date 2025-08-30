import React, { useState, useRef } from 'react';
import { Empresa } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevaEmpresaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Empresa, 'id'>) => void;
}

const NuevaEmpresaModal: React.FC<NuevaEmpresaModalProps> = ({ isOpen, onClose, onSave }) => {
    const [nombre, setNombre] = useState('');
    const [rnc, setRnc] = useState('');
    const [error, setError] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!nombre.trim() || !rnc.trim()) {
            setError('Ambos campos son obligatorios.');
            return;
        }
        onSave({ nombre, rnc });
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setNombre(''); setRnc(''); setError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nueva Empresa">
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                     <div>
                        <label htmlFor="nombre-empresa" className="block text-sm font-medium">Nombre de la Empresa *</label>
                        <input type="text" id="nombre-empresa" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="rnc-empresa" className="block text-sm font-medium">RNC *</label>
                        <input type="text" id="rnc-empresa" value={rnc} onChange={e => setRnc(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                    </div>
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                    <Button type="submit">Guardar Empresa</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevaEmpresaModal;