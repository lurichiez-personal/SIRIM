import React, { useState, useEffect, useRef } from 'react';
import { Empleado } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import { useDataStore } from '../../stores/useDataStore';
import { InformationCircleIcon } from '../../components/icons/Icons';

interface NuevoEmpleadoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Empleado, 'id' | 'empresaId'> | Empleado) => void;
  empleadoParaEditar: Empleado | null;
}

const NuevoEmpleadoModal: React.FC<NuevoEmpleadoModalProps> = ({ isOpen, onClose, onSave, empleadoParaEditar }) => {
    const { findDesvinculacionByCedula } = useDataStore();
    const [nombre, setNombre] = useState('');
    const [cedula, setCedula] = useState('');
    const [puesto, setPuesto] = useState('');
    const [salarioBrutoMensual, setSalarioBrutoMensual] = useState('');
    const [fechaIngreso, setFechaIngreso] = useState('');
    const [activo, setActivo] = useState(true);
    const [rehireInfo, setRehireInfo] = useState<string | null>(null);
    const [errors, setErrors] = useState<any>({});
    
    const isEditMode = !!empleadoParaEditar;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    useEffect(() => {
        if (isOpen) {
            if (empleadoParaEditar) {
                setNombre(empleadoParaEditar.nombre);
                setCedula(empleadoParaEditar.cedula);
                setPuesto(empleadoParaEditar.puesto);
                setSalarioBrutoMensual(String(empleadoParaEditar.salarioBrutoMensual));
                setFechaIngreso(empleadoParaEditar.fechaIngreso);
                setActivo(empleadoParaEditar.activo);
            } else {
                resetForm();
            }
        }
    }, [isOpen, empleadoParaEditar]);
    
    const handleCedulaBlur = () => {
        if (isEditMode) return;
        const cleanCedula = cedula.replace(/-/g, '');
        if (cleanCedula.length === 11) {
            const previousRecord = findDesvinculacionByCedula(cedula);
            if (previousRecord) {
                const fechaSalida = new Date(previousRecord.fechaSalida + 'T00:00:00').toLocaleDateString('es-DO');
                setRehireInfo(`Este empleado trabajó anteriormente en la empresa y su fecha de salida fue el ${fechaSalida}.`);
            } else {
                setRehireInfo(null);
            }
        } else {
            setRehireInfo(null);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = {
            nombre,
            cedula,
            puesto,
            salarioBrutoMensual: parseFloat(salarioBrutoMensual),
            fechaIngreso,
            activo
        };

        if (isEditMode) {
            onSave({ ...empleadoParaEditar, ...data });
        } else {
            onSave(data);
        }
        onClose();
    };

    const resetForm = () => {
        setNombre(''); setCedula(''); setPuesto(''); setSalarioBrutoMensual(''); 
        setFechaIngreso(''); setActivo(true); setErrors({}); setRehireInfo(null);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Editar Empleado' : 'Crear Nuevo Empleado'}>
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nombre-empleado" className="block text-sm font-medium">Nombre Completo *</label>
                            <input type="text" id="nombre-empleado" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="cedula-empleado" className="block text-sm font-medium">Cédula *</label>
                            <input type="text" id="cedula-empleado" value={cedula} onChange={e => setCedula(e.target.value)} onBlur={handleCedulaBlur} required className="mt-1 w-full border-secondary-300 rounded-md" placeholder="000-0000000-0" disabled={isEditMode}/>
                        </div>
                    </div>
                     {rehireInfo && (
                        <div className="flex items-center text-xs text-blue-600 p-2 bg-blue-50 rounded-md">
                            <InformationCircleIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            {rehireInfo}
                        </div>
                    )}
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="puesto-empleado" className="block text-sm font-medium">Puesto *</label>
                            <input type="text" id="puesto-empleado" value={puesto} onChange={e => setPuesto(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="salario-empleado" className="block text-sm font-medium">Salario Bruto Mensual *</label>
                            <input type="number" id="salario-empleado" value={salarioBrutoMensual} onChange={e => setSalarioBrutoMensual(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="fecha-ingreso" className="block text-sm font-medium">Fecha de Ingreso *</label>
                            <input type="date" id="fecha-ingreso" value={fechaIngreso} onChange={e => setFechaIngreso(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <p className="block text-sm font-medium">Estado</p>
                            <div className="mt-2 flex space-x-4">
                               <label><input type="radio" name="status" value="activo" checked={activo} onChange={() => setActivo(true)} /> Activo</label>
                               <label><input type="radio" name="status" value="inactivo" checked={!activo} onChange={() => setActivo(false)} /> Inactivo</label>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? 'Actualizar Empleado' : 'Crear Empleado'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoEmpleadoModal;