
import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const LoginPage: React.FC = () => {
  const { triggerMicrosoftLogin, loginWithPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await loginWithPassword(email, password);
    if (!success) {
      setError('Credenciales incorrectas o usuario inactivo.');
    }
    setLoading(false);
  };
  
  const handleMicrosoftLogin = () => {
    setError('');
    setLoading(true);
    const success = triggerMicrosoftLogin();
    if (!success) {
      setError('No se pudo iniciar sesión con Microsoft.');
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
            <LogoIcon className="h-12 w-12 text-primary" />
            <h1 className="mt-4 text-3xl font-bold text-center text-secondary-900">
                Bienvenido a SIRIM
            </h1>
            <p className="mt-2 text-sm text-center text-secondary-600">
                Inicie sesión para gestionar su contabilidad
            </p>
        </div>
        
        <div className="space-y-4">
            <Button 
                onClick={handleMicrosoftLogin} 
                className="w-full"
                variant="secondary"
                disabled={loading}
                leftIcon={
                    <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 1.05V10.5H20V1.05H10.5ZM1.05 1.05V10.5H10.5V1.05H1.05ZM1.05 10.5V20H10.5V10.5H1.05ZM10.5 10.5V20H20V10.5H10.5Z" fill="#808080"/>
                    </svg>
                }
            >
                Iniciar sesión con Microsoft 365
            </Button>
            
            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400 text-xs">O INICIE CON EMAIL</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <form onSubmit={handleLocalLogin} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700">Email</label>
                    <input
                        id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                        required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                    />
                </div>
                 <div>
                    <label htmlFor="password"className="block text-sm font-medium text-secondary-700">Contraseña</label>
                    <input
                        id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                        required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                    />
                </div>
                 {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
