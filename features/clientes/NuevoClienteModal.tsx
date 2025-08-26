import React, { useState, useEffect, useRef } from 'react';
import { Cliente } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useDGIIDataStore } from '../../stores/useDGIIDataStore';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';

interface NuevoClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: Omit<Cliente, 'id' | 'empresaId' | 'createdAt'>) => void;
  clienteParaEditar?: Cliente | null;
}

const NuevoClienteModal: React.FC<NuevoClienteModalProps> = ({ isOpen, onClose, onSave, clienteParaEditar }) => {
    const [nombre, setNombre] = useState('');
    const [rnc, setRnc] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [condicionesPago, setCondicionesPago] = useState('');
    const [activo, setActivo] = useState(true);
    const [errors, setErrors] = useState<{ nombre?: string; rnc?: string }>({});
    
    const { lookupRNC, loading: isLookingUpRNC } = useDGIIDataStore();
    const isEditMode = !!clienteParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen && clienteParaEditar) {
            setNombre(clienteParaEditar.nombre);
            setRnc(clienteParaEditar.rnc || '');
            setEmail(clienteParaEditar.email || '');
            setTelefono(clienteParaEditar.telefono || '');
            setCondicionesPago(clienteParaEditar.condicionesPago || '');
            setActivo(clienteParaEditar.activo);
        } else {
            resetForm();
        }
    }, [isOpen, clienteParaEditar]);


    const validate = () => {
        const newErrors: { nombre?: string } = {};
        if (!nombre.trim()) {
            newErrors.nombre = 'El nombre es obligatorio.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }
        onSave({
            nombre,
            rnc,
            email,
            telefono,
            activo,
            condicionesPago,
        });
        resetForm();
        onClose();
    };
    
    const resetForm = () => {
        setNombre('');
        setRnc('');
        setEmail('');
        setTelefono('');
        setCondicionesPago('');
        setActivo(true);
        setErrors({});
    }

    const handleClose = () => {
        resetForm();
        onClose();
    }
    
    const handleRNCBlur = async () => {
        if (rnc && rnc.trim() !== '') {
            try {
                const result = await lookupRNC(rnc);
                if (result) {
                    setNombre(result.nombre);
                } else {
                    setErrors(prev => ({ ...prev, rnc: 'No se encontró el RNC en DGII.' }));
                }
            } catch (error: any) {
                setErrors(prev => ({ ...prev, rnc: error?.message || 'Error al buscar el RNC. Intente nuevamente.' }));
            }
        }
    };

    const renderInput = (label: string, id: string, value: string, onChange: (value: string) => void, error?: string, placeholder?: string, onBlur?: () => void) => (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-secondary-700">{label}</label>
            <div className="relative mt-1">
                <input
                    type="text"
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    className={`block w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-secondary-300'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm`}
                    placeholder={placeholder}
                />
                {id === 'rnc' && isLookingUpRNC && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <svg className="animate-spin h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                  </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={isEditMode ? "Editar Cliente" : "Crear Nuevo Cliente"}
        >
                <form ref={formRef} onSubmit={handleSubmit} noValidate>
                        <div className="p-6 space-y-4">
                            {errors.rnc && (
                                <div className="mb-2 p-2 bg-red-100 text-red-700 rounded">{errors.rnc}</div>
                            )}
                {renderInput('Nombre / Razón Social *', 'nombre', nombre, setNombre, errors.nombre, 'Ej: Mi Empresa S.R.L.')}
                {renderInput('RNC', 'rnc', rnc, setRnc, undefined, 'Ej: 130123456', handleRNCBlur)}
                {renderInput('Email', 'email', email, setEmail, undefined, 'Ej: contacto@empresa.com')}
                {renderInput('Teléfono', 'telefono', telefono, setTelefono, undefined, 'Ej: 809-555-1234')}
                {renderInput('Condiciones de Pago', 'condiciones', condicionesPago, setCondicionesPago, undefined, 'Ej: Neto 30 días')}
                {isEditMode && (
                    <div>
                        <label className="block text-sm font-medium text-secondary-700">Estado</label>
                        <div className="mt-2 flex items-center space-x-4">
                            <label className="inline-flex items-center">
                                <input type="radio" className="form-radio text-primary" name="status" value="activo" checked={activo} onChange={() => setActivo(true)} />
                                <span className="ml-2">Activo</span>
                            </label>
                             <label className="inline-flex items-center">
                                <input type="radio" className="form-radio text-primary" name="status" value="inactivo" checked={!activo} onChange={() => setActivo(false)} />
                                <span className="ml-2">Inactivo</span>
                            </label>
                        </div>
                    </div>
                )}
            </div>
             <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                 <Button type="button" variant="secondary" onClick={handleClose}>Cancelar</Button>
                 <Button type="submit">{isEditMode ? "Actualizar Cliente" : "Guardar Cliente"}</Button>
            </div>
          </form>
        </Modal>
    );
};

export default NuevoClienteModal;