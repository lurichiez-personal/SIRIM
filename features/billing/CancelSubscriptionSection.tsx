// Componente para cancelar suscripción
import React, { useState } from 'react';
import Button from '../../components/ui/Button';

interface Subscription {
  id: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  stripeSubscriptionId?: string;
  plan?: {
    name: string;
    price: number;
  };
}

interface Props {
  subscription: Subscription;
  onCancelSuccess: () => void;
}

const CancelSubscriptionSection: React.FC<Props> = ({ subscription, onCancelSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCancelRequest = () => {
    if (subscription.status !== 'active') {
      setError('Solo se pueden cancelar suscripciones activas');
      return;
    }
    setShowConfirmation(true);
    setError(null);
  };

  const confirmCancellation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subscriptionId: subscription.stripeSubscriptionId || subscription.id
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowConfirmation(false);
        onCancelSuccess();
        // Mostrar mensaje de éxito sin usar alert
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
        successMessage.innerHTML = `
          <strong>¡Éxito!</strong> Tu suscripción ha sido cancelada. Tendrás acceso hasta ${new Date(subscription.currentPeriodEnd).toLocaleDateString('es-DO')}.
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => document.body.removeChild(successMessage), 5000);
      } else {
        setError(data.message || 'Error al cancelar la suscripción');
      }
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      setError('Error de conexión al cancelar la suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelConfirmation = () => {
    setShowConfirmation(false);
    setError(null);
  };

  // No mostrar si la suscripción ya está cancelada
  if (subscription.status === 'cancelled' || subscription.status === 'past_due') {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Cancelar Suscripción</h3>
      
      {!showConfirmation ? (
        <div>
          <p className="text-gray-600 mb-4">
            Si decides cancelar tu suscripción, mantendrás acceso completo a todas las funciones hasta 
            el final de tu período de facturación actual (<strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('es-DO')}</strong>).
          </p>
          <p className="text-gray-600 mb-6">
            Después de esa fecha, tu cuenta será downgrade a un plan gratuito limitado y tus datos se mantendrán seguros.
          </p>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          <Button
            onClick={handleCancelRequest}
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
          >
            Cancelar mi suscripción
          </Button>
        </div>
      ) : (
        <div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  ¿Estás seguro de que quieres cancelar tu suscripción?
                </h3>
                <div className="text-sm text-red-700">
                  <p className="mb-2">Al cancelar tu suscripción {subscription.plan?.name}:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mantendrás acceso hasta el <strong>{new Date(subscription.currentPeriodEnd).toLocaleDateString('es-DO')}</strong></li>
                    <li>No se realizarán más cobros automáticos</li>
                    <li>Perderás acceso a funciones premium después del período actual</li>
                    <li>Tus datos se mantendrán seguros pero con acceso limitado</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <div className="flex space-x-3">
            <Button
              onClick={confirmCancellation}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Cancelando...' : 'Sí, cancelar suscripción'}
            </Button>
            <Button
              onClick={cancelConfirmation}
              variant="outline"
              disabled={isLoading}
            >
              No, mantener suscripción
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancelSubscriptionSection;