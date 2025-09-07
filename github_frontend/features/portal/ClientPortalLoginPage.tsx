
import React, { useState } from 'react';
import { useClientAuthStore } from '../../stores/useClientAuthStore';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const ClientPortalLoginPage: React.FC = () => {
  const { triggerLogin } = useClientAuthStore();
  const [email, setEmail] = useState('cliente@demo.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const success = await triggerLogin(email, password);
    if (!success) {
      setError('Credenciales incorrectas o no tiene acceso al portal.');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
            <LogoIcon className="h-12 w-12 text-primary" />
            <h1 className="mt-4 text-2xl font-bold text-center text-secondary-900">
                Portal de Clientes
            </h1>
            <p className="mt-2 text-sm text-center text-secondary-600">
                Acceda a sus facturas y cotizaciones.
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="email" className="block text-sm font-medium text-secondary-700">Email</label>
                <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                    placeholder="su-email@ejemplo.com"
                />
            </div>

            <div>
                <label htmlFor="password" className="block text-sm font-medium text-secondary-700">Contraseña</label>
                <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm"
                    placeholder="Contraseña"
                />
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </Button>
        </form>
      </div>
    </div>
  );
};

export default ClientPortalLoginPage;
