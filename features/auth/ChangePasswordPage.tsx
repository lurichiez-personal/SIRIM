import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const ChangePasswordPage: React.FC = () => {
    const { user, changePassword } = useAuthStore();
    const navigate = useNavigate();
    
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        
        setLoading(true);
        const success = await changePassword(newPassword);

        if (success) {
            navigate('/dashboard', { replace: true });
        } else {
            setError('No se pudo cambiar la contraseña. Intente de nuevo.');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-secondary-50">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
                <div className="flex flex-col items-center">
                    <LogoIcon className="h-12 w-12 text-primary" />
                    <h1 className="mt-4 text-2xl font-bold text-center text-secondary-900">
                        Cambio de Contraseña Requerido
                    </h1>
                    <p className="mt-2 text-sm text-center text-secondary-600">
                        Hola {user?.nombre}, por seguridad, debes establecer una nueva contraseña para continuar.
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-secondary-700">Nueva Contraseña</label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-secondary-700">Confirmar Nueva Contraseña</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                        />
                    </div>

                    {error && <p className="text-sm text-red-600 text-center">{error}</p>}

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Guardando...' : 'Establecer Nueva Contraseña'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default ChangePasswordPage;
