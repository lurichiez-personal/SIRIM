
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const RegistroPage: React.FC = () => {
  const { register } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    rnc: '',
    nombreUsuario: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Obtener parámetros del plan seleccionado
  const selectedPlan = searchParams.get('plan') || 'basico';
  const isTrial = searchParams.get('trial') !== 'false';

  const planNames = {
    basico: 'Plan Básico',
    pro: 'Plan Pro', 
    premium: 'Plan Premium'
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Simple validation
    if (Object.values(formData).some(val => val.trim() === '')) {
        setError('Todos los campos son obligatorios.');
        setLoading(false);
        return;
    }
    
    // Si es prueba gratuita, registrar directamente
    if (isTrial) {
      const success = await register(formData);
      
      if (success) {
        navigate('/dashboard');
      } else {
        setError('No se pudo completar el registro. Es posible que el correo ya esté en uso.');
      }
    } else {
      // Si es compra directa, guardar datos y ir al checkout
      sessionStorage.setItem('registrationData', JSON.stringify(formData));
      navigate(`/checkout?plan=${selectedPlan}&trial=false`);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50 py-12">
      <div className="w-full max-w-lg p-8 space-y-6 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
            <LogoIcon className="h-12 w-12 text-primary" />
            <h1 className="mt-4 text-3xl font-bold text-center text-secondary-900">
                Crea tu cuenta en SIRIM
            </h1>
            <p className="mt-2 text-sm text-center text-secondary-600">
                {isTrial ? (
                  `Inicia tu prueba gratuita de 30 días con ${planNames[selectedPlan as keyof typeof planNames]}`
                ) : (
                  `Registra tu empresa para ${planNames[selectedPlan as keyof typeof planNames]}`
                )}
            </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <h3 className="text-lg font-medium text-secondary-800 border-b pb-2 mb-4">Información de la Empresa</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="nombreEmpresa" className="block text-sm font-medium text-secondary-700">Nombre de la Empresa</label>
                        <input id="nombreEmpresa" type="text" onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="rnc" className="block text-sm font-medium text-secondary-700">RNC</label>
                        <input id="rnc" type="text" onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm" />
                    </div>
                </div>
            </div>
             <div>
                <h3 className="text-lg font-medium text-secondary-800 border-b pb-2 mb-4">Información de Usuario Administrador</h3>
                 <div className="space-y-4">
                    <div>
                        <label htmlFor="nombreUsuario" className="block text-sm font-medium text-secondary-700">Tu Nombre Completo</label>
                        <input id="nombreUsuario" type="text" onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-secondary-700">Email</label>
                        <input id="email" type="email" onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-secondary-700">Contraseña</label>
                        <input id="password" type="password" onChange={handleChange} required className="mt-1 block w-full px-3 py-2 border border-secondary-300 rounded-md shadow-sm" />
                    </div>
                 </div>
            </div>

            {error && <p className="text-sm text-red-600 text-center">{error}</p>}
            
            <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Procesando...' : (
                  isTrial ? 'Comenzar Prueba Gratuita' : 'Continuar al Pago'
                )}
            </Button>
        </form>
      </div>
    </div>
  );
};

export default RegistroPage;
