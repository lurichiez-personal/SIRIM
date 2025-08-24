
import React from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { LogoIcon } from '../../components/icons/Icons';
import Button from '../../components/ui/Button';

const LoginPage: React.FC = () => {
  const { triggerLogin } = useAuthStore();

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
            <LogoIcon className="h-12 w-12 text-primary" />
            <h1 className="mt-4 text-3xl font-bold text-center text-secondary-900">
                Bienvenido a SIRIM
            </h1>
            <p className="mt-2 text-sm text-center text-secondary-600">
                Inicie sesión para gestionar su contabilidad
            </p>
        </div>
        
        <div className="mt-8">
            <Button 
                onClick={triggerLogin} 
                className="w-full"
                leftIcon={
                    <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10.5 1.05V10.5H20V1.05H10.5ZM1.05 1.05V10.5H10.5V1.05H1.05ZM1.05 10.5V20H10.5V10.5H1.05ZM10.5 10.5V20H20V10.5H10.5Z" fill="#F25022"/>
                    </svg>
                }
            >
                Iniciar sesión con Microsoft 365
            </Button>
        </div>
        <p className="mt-6 text-xs text-center text-secondary-500">
           Al iniciar sesión, usted acepta nuestros Términos de Servicio y Política de Privacidad.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;