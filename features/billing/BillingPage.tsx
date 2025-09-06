// Página de facturación y suscripción con Stripe
import React, { useState, useEffect } from 'react';
import { StripeProvider } from './StripeProvider';
import { SubscriptionManager } from './SubscriptionManager';
import { useAuthStore } from '../../stores/useAuthStore';

interface SubscriptionStatus {
  hasSubscription: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    trialEndsAt?: string;
    cancelledAt?: string;
    cancellationDate?: string;
  };
}

const BillingPage: React.FC = () => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      loadSubscriptionStatus();
    }
  }, [isAuthenticated]);

  const loadSubscriptionStatus = async () => {
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

      const response = await fetch('/api/stripe/subscription-status', {
        headers
      });

      const data = await response.json();

      if (data.success) {
        setSubscriptionStatus(data.data);
      } else {
        setError(data.message || 'Error al cargar estado de suscripción');
      }
    } catch (error) {
      console.error('Error cargando suscripción:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (immediately = false) => {
    if (!confirm(immediately 
      ? '¿Estás seguro de que deseas cancelar tu suscripción inmediatamente?' 
      : '¿Estás seguro de que deseas cancelar tu suscripción al final del período actual?'
    )) {
      return;
    }

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
        body: JSON.stringify({ immediately })
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        loadSubscriptionStatus(); // Recargar estado
      } else {
        alert(data.message || 'Error al cancelar suscripción');
      }
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      alert('Error de conexión al cancelar suscripción');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded-full">Activa</span>;
      case 'trial':
        return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">Prueba</span>;
      case 'pending_cancellation':
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">Cancelación Pendiente</span>;
      case 'cancelled':
        return <span className="px-2 py-1 text-xs font-semibold bg-red-100 text-red-800 rounded-full">Cancelada</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Acceso Requerido</h2>
        <p className="text-gray-600">
          Debes iniciar sesión para acceder a la información de facturación.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Cargando información de facturación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <p className="text-red-700">{error}</p>
          <button 
            onClick={loadSubscriptionStatus}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!subscriptionStatus?.hasSubscription) {
    return (
      <StripeProvider>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto py-12 px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900">
                Comienza tu Suscripción a SIRIM
              </h1>
              <p className="mt-4 text-xl text-gray-600">
                Gestiona tu contabilidad e impuestos de forma profesional
              </p>
            </div>
            
            <SubscriptionManager onSubscriptionCreated={loadSubscriptionStatus} />
          </div>
        </div>
      </StripeProvider>
    );
  }

  const subscription = subscriptionStatus.subscription!;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Mi Suscripción</h1>
          <p className="mt-4 text-xl text-gray-600">
            Gestiona tu plan y facturación
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Estado de Suscripción</h2>
              <p className="text-gray-600">Información actual de tu plan</p>
            </div>
            {getStatusBadge(subscription.status)}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Período Actual</h3>
              <p className="text-gray-900">
                {formatDate(subscription.currentPeriodStart)} - {formatDate(subscription.currentPeriodEnd)}
              </p>
            </div>

            {subscription.trialEndsAt && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Fin de Prueba Gratuita</h3>
                <p className="text-gray-900">{formatDate(subscription.trialEndsAt)}</p>
              </div>
            )}

            {subscription.cancellationDate && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Fecha de Cancelación</h3>
                <p className="text-gray-900">{formatDate(subscription.cancellationDate)}</p>
              </div>
            )}
          </div>

          {subscription.status === 'ACTIVE' || subscription.status === 'TRIAL' ? (
            <div className="mt-8 flex gap-4">
              <button
                onClick={() => cancelSubscription(false)}
                className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
              >
                Cancelar al Final del Período
              </button>
              <button
                onClick={() => cancelSubscription(true)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Cancelar Inmediatamente
              </button>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Soporte</h2>
          <p className="text-gray-600 mb-4">
            ¿Necesitas ayuda con tu suscripción? Contáctanos para resolver cualquier duda.
          </p>
          <div className="flex gap-4">
            <a
              href="mailto:lurichiez@gmail.com"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Contactar Soporte
            </a>
            <button
              onClick={loadSubscriptionStatus}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Actualizar Estado
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPage;