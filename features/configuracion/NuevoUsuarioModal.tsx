
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Role } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import Checkbox from '../../components/ui/Checkbox';
import { useAuthStore } from '../../stores/useAuthStore';

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<User, 'id'> | User) => void;
  userToEdit: User | null;
}

const NuevoUsuarioModal: React.FC<NuevoUsuarioModalProps> = ({ isOpen, onClose, onSave, userToEdit }) => {
    const { user: currentUser } = useAuthStore();

    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState<Set<Role>>(new Set());
    const [activo, setActivo] = useState(true);
    const [errors, setErrors] = useState<any>({});
    
    const isEditMode = !!userToEdit;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const availableRoles = useMemo(() => {
        if (currentUser?.roles.includes(Role.Contador)) {
            return Object.values(Role); // Master user can assign any role
        }
        if (currentUser?.roles.includes(Role.Admin)) {
            // Admin can only assign lower-level roles
            return [Role.Operaciones, Role.Aprobador, Role.Usuario];
        }
        return [];
    }, [currentUser]);

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setNombre(userToEdit.nombre);
                setEmail(userToEdit.email);
                setRoles(new Set(userToEdit.roles));
                setActivo(userToEdit.activo);
                setPassword('');
            } else {
                resetForm();
            }
        }
    }, [isOpen, userToEdit]);
    
    const handleRoleChange = (role: Role, checked: boolean) => {
        setRoles(prev => {
            const newRoles = new Set(prev);
            if (checked) newRoles.add(role);
            else newRoles.delete(role);
            return newRoles;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Basic validation
        if (!nombre.trim() || !email.trim() || roles.size === 0) {
            alert('Por favor, complete todos los campos obligatorios.');
            return;
        }
        if (!isEditMode && !password.trim()) {
            alert('La contraseña es obligatoria para nuevos usuarios.');
            return;
        }

        const baseData = {
            nombre,
            email,
            roles: Array.from(roles),
            activo,
        };

        if (isEditMode) {
            const updatedUser: User = {
                ...userToEdit,
                ...baseData,
                ...(password.trim() && userToEdit.authMethod === 'local' && { password: password.trim() })
            };
            onSave(updatedUser);
        } else {
            const newUser: Omit<User, 'id'> = {
                ...baseData,
                authMethod: 'local',
                password: password.trim()
            };
            onSave(newUser);
        }
        onClose();
    };

    const resetForm = () => {
        setNombre(''); setEmail(''); setPassword(''); setRoles(new Set()); setActivo(true); setErrors({});
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}>
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nombre-user" className="block text-sm font-medium">Nombre *</label>
                            <input type="text" id="nombre-user" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="email-user" className="block text-sm font-medium">Email *</label>
                            <input type="email" id="email-user" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" disabled={isEditMode}/>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="password-user" className="block text-sm font-medium">Contraseña</label>
                        <input type="password" id="password-user" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" placeholder={isEditMode ? 'Dejar en blanco para no cambiar' : 'Requerida'} />
                    </div>
                    <div>
                        <p className="block text-sm font-medium">Roles *</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                            {availableRoles.map(role => (
                                <Checkbox key={role} label={role} checked={roles.has(role)} onChange={(checked) => handleRoleChange(role, checked)} />
                            ))}
                        </div>
                    </div>
                     <div>
                        <p className="block text-sm font-medium">Estado</p>
                        <div className="mt-2 flex space-x-4">
                           <label><input type="radio" name="status" value="activo" checked={activo} onChange={() => setActivo(true)} /> Activo</label>
                           <label><input type="radio" name="status" value="inactivo" checked={!activo} onChange={() => setActivo(false)} /> Inactivo</label>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
                    <Button type="submit">{isEditMode ? 'Actualizar Usuario' : 'Crear Usuario'}</Button>
                </div>
            </form>
        </Modal>
    );
};

export default NuevoUsuarioModal;