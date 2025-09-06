// Página para manejar el callback de Microsoft OAuth
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const MicrosoftCallbackPage: React.FC = () => {
  const { handleMicrosoftCallback } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Procesando autenticación con Microsoft...');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const success = await handleMicrosoftCallback();
        if (success) {
          setStatus('success');
          setMessage('¡Autenticación exitosa! Redirigiendo...');
          // Redireccionar al dashboard después de 2 segundos
          setTimeout(() => {
            window.location.href = '/#/dashboard';
          }, 2000);
        } else {
          setStatus('error');
          setMessage('No se pudo completar la autenticación. Intente nuevamente.');
        }
      } catch (error) {
        console.error('Error en callback de Microsoft:', error);
        setStatus('error');
        setMessage('Error procesando la autenticación de Microsoft.');
      }
    };

    processCallback();
  }, [handleMicrosoftCallback]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-secondary-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-lg text-center">
        <div className="text-4xl mb-4">
          {status === 'loading' && '⏳'}
          {status === 'success' && '✅'}
          {status === 'error' && '❌'}
        </div>
        
        <h1 className="text-2xl font-bold text-secondary-800">
          Microsoft Office 365
        </h1>
        
        <p className="text-secondary-600">{message}</p>
        
        {status === 'loading' && (
          <div className="flex justify-center">
            <LoadingSpinner size="large" />
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <button
              onClick={() => window.location.href = '/#/login'}
              className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Volver al Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MicrosoftCallbackPage;