import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAlertStore } from '../../stores/useAlertStore';
import { storage } from '../../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { UserCircleIcon } from '../../components/icons/Icons';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
    const { user, updateCurrentUserProfile } = useAuthStore();
    const { showAlert } = useAlertStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [nombre, setNombre] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && user) {
            setNombre(user.nombre);
            setPhotoPreview(user.photoURL || null);
            // Reset fields on open
            setError('');
            setNewPassword('');
            setConfirmPassword('');
            setPhotoFile(null);
        }
    }, [isOpen, user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoFile(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword && newPassword !== confirmPassword) {
            setError('Las nuevas contraseñas no coinciden.');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            setError('La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        setIsSaving(true);
        const updates: { nombre?: string; password?: string; photoURL?: string } = {};

        if (nombre !== user?.nombre) {
            updates.nombre = nombre;
        }
        if (newPassword) {
            updates.password = newPassword;
        }
        
        try {
            if (photoFile && user) {
                const storageRef = ref(storage, `profile_pictures/${user.id}`);
                const snapshot = await uploadBytes(storageRef, photoFile);
                updates.photoURL = await getDownloadURL(snapshot.ref);
            }

            if (Object.keys(updates).length > 0) {
                const success = await updateCurrentUserProfile(updates);
                if (success) {
                    showAlert('Éxito', 'Tu perfil ha sido actualizado.');
                    onClose();
                }
            } else {
                showAlert('Información', 'No se realizaron cambios en el perfil.');
                onClose();
            }
        } catch (err) {
            setError('Ocurrió un error al guardar. Por favor, inténtelo de nuevo.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mi Perfil">
            <form onSubmit={handleSubmit}>
                <div className="p-6 space-y-6">
                    <div className="flex flex-col items-center space-y-4">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Vista previa del perfil" className="h-24 w-24 rounded-full object-cover" />
                        ) : (
                            <UserCircleIcon className="h-24 w-24 text-secondary-300" />
                        )}
                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                            Cambiar Foto
                        </Button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label htmlFor="profile-name" className="block text-sm font-medium text-secondary-700">Nombre Completo</label>
                            <input type="text" id="profile-name" value={nombre} onChange={e => setNombre(e.target.value)} required className="mt-1 w-full border-secondary-300 rounded-md" />
                        </div>
                        <div>
                            <label htmlFor="profile-email" className="block text-sm font-medium text-secondary-700">Email</label>
                            <input type="email" id="profile-email" value={user?.email || ''} disabled className="mt-1 w-full border-secondary-300 rounded-md bg-secondary-100 cursor-not-allowed" />
                        </div>
                    </div>
                    
                    <div className="border-t pt-6 space-y-4">
                         <h4 className="text-md font-semibold text-secondary-800">Cambiar Contraseña</h4>
                         <div>
                            <label htmlFor="profile-new-password"className="block text-sm font-medium text-secondary-700">Nueva Contraseña</label>
                            <input id="profile-new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1 block w-full border-secondary-300 rounded-md" placeholder="Dejar en blanco para no cambiar" />
                        </div>
                         <div>
                            <label htmlFor="profile-confirm-password"className="block text-sm font-medium text-secondary-700">Confirmar Nueva Contraseña</label>
                            <input id="profile-confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-1 block w-full border-secondary-300 rounded-md" />
                        </div>
                    </div>

                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                </div>

                <div className="flex justify-end items-center p-4 bg-secondary-50 border-t border-secondary-200 rounded-b-lg space-x-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Cancelar</Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default ProfileModal;
