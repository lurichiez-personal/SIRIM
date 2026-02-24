import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, Role } from '../../types';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { useEnterToNavigate } from '../../hooks/useEnterToNavigate';
import Checkbox from '../../components/ui/Checkbox';
import { useAuthStore } from '../../stores/useAuthStore';
import { useTenantStore } from '../../stores/useTenantStore';

interface NuevoUsuarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { user: Omit<User, 'id'> | User, password?: string }) => void;
  userToEdit: User | null;
  empresaId?: string;
}

const NuevoUsuarioModal: React.FC<NuevoUsuarioModalProps> = ({ isOpen, onClose, onSave, userToEdit, empresaId }) => {
    const { user: currentUser } = useAuthStore();
    const { availableTenants } = useTenantStore();

    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [roles, setRoles] = useState<Set<Role>>(new Set());
    const [activo, setActivo] = useState(true);
    const [selectedEmpresaId, setSelectedEmpresaId] = useState<string | undefined>('');
    const [errors, setErrors] = useState<any>({});
    
    const isEditMode = !!userToEdit;
    const formRef = useRef<HTMLFormElement>(null);
    useEnterToNavigate(formRef);

    const isContador = useMemo(() => currentUser?.roles.includes(Role.Contador), [currentUser]);

    const availableRoles = useMemo(() => {
        if (isContador) {
            return Object.values(Role); // Master user can assign any role
        }
        if (currentUser?.roles.includes(Role.Admin)) {
            // Admin can only assign lower-level roles
            return [Role.Operaciones, Role.Aprobador, Role.Usuario, Role.GerenteRRHH, Role.AuditorNomina];
        }
        return [];
    }, [currentUser, isContador]);
    
    const resetForm = () => {
        setNombre(''); setEmail(''); setPassword(''); setRoles(new Set([Role.Usuario])); setActivo(true); setErrors({});
        setSelectedEmpresaId(empresaId); // Default to the current tenant's ID on reset for creation
    };

    useEffect(() => {
        if (isOpen) {
            if (userToEdit) {
                setNombre(userToEdit.nombre);
                setEmail(userToEdit.email);
                setRoles(new Set(userToEdit.roles));
                setActivo(userToEdit.activo);
                setSelectedEmpresaId(userToEdit.empresaId);
                setPassword('');
            } else {
                resetForm();
            }
        }
    }, [isOpen, userToEdit, empresaId]);
    
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
        
        const finalNombre = nombre.trim();
        const finalEmail = email.trim();

        if (!finalNombre || !finalEmail || roles.size === 0 || !selectedEmpresaId || (!isEditMode && (!password || password.length < 6))) {
            alert('Por favor, complete todos los campos obligatorios, incluyendo la empresa. La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        
        const baseData = {
            nombre: finalNombre,
            email: finalEmail,
            roles: [...roles],
            activo,
        };

        if (isEditMode) {
            const updatedUser: User = {
                ...userToEdit!,
                ...baseData,
                empresaId: selectedEmpresaId,
            };
            onSave({ user: updatedUser, password: password || undefined });
        } else {
            const newUser: Omit<User, 'id'> = {
                ...baseData,
                authMethod: 'local',
                empresaId: selectedEmpresaId,
            };
            onSave({ user: newUser, password: password! });
        }
        onClose();
    };

    const currentCompanyName = useMemo(() => {
        const tenantId = isEditMode ? userToEdit?.empresaId : empresaId;
        const tenant = availableTenants.find(t => t.id === tenantId);
        return tenant?.nombre || 'Cargando...';
    }, [availableTenants, empresaId, userToEdit, isEditMode]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditMode ? 'Editar Usuario' : 'Crear Nuevo Usuario'}>
            <form ref={formRef} onSubmit={handleSubmit} noValidate>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nombre-user" className="block text-sm font-medium">Nombre Completo *</label>
                            <input type="text" id="nombre-user" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="email-user" className="block text-sm font-medium">Email *</label>
                            <input type="email" id="email-user" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" disabled={isEditMode}/>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="password-user" className="block text-sm font-medium">
                            {isEditMode ? 'Nueva Contraseña' : 'Contraseña Temporal *'}
                        </label>
                        <input type="password" id="password-user" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full border-secondary-300 rounded-md" placeholder={isEditMode ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'} required={!isEditMode} />
                    </div>
                     <div>
                        <label htmlFor="empresa-user" className="block text-sm font-medium">Empresa *</label>
                        {isContador ? (
                            <select
                                id="empresa-user"
                                value={selectedEmpresaId || ''}
                                onChange={e => setSelectedEmpresaId(e.target.value)}
                                required
                                className="mt-1 w-full border-secondary-300 rounded-md"
                            >
                                <option value="" disabled>Seleccione una empresa</option>
                                {availableTenants.map(tenant => (
                                    <option key={tenant.id} value={tenant.id}>{tenant.nombre}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                id="empresa-user-display"
                                value={currentCompanyName}
                                readOnly
                                className="mt-1 w-full border-secondary-300 rounded-md bg-secondary-100"
                            />
                        )}
                    </div>
                    <div>
                        <p className="block text-sm font-medium">Roles *</p>
                        <div className="mt-2 grid grid-cols-2 lg:grid-cols-3 gap-2">
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
