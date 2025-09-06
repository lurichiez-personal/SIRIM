// Componente para manejar la suscripción y el pago con Stripe
import React, { useState, useEffect } from 'react';
import { useStripe as useStripeHook, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useAuthStore } from '../../stores/useAuthStore';

interface Plan {
  id: string;
  name: string;
  description: string;
  amount: number;
  currency: string;
  interval: string;
  interval_count: number;
}

interface SubscriptionManagerProps {
  plans?: Plan[];
  onSubscriptionCreated?: (subscription: any) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({
  plans = [],
  onSubscriptionCreated
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const stripe = useStripeHook();
  const elements = useElements();

  // Cargar planes disponibles desde Stripe
  useEffect(() => {
    if (plans.length === 0) {
      loadAvailablePlans();
    }
  }, []);

  const loadAvailablePlans = async () => {
    try {
      const response = await fetch('/api/stripe/plans');
      const data = await response.json();
      
      if (!data.success) {
        setError(data.error || 'Error al cargar planes');
      }
    } catch (error) {
      console.error('Error cargando planes:', error);
      setError('Error de conexión al cargar planes');
    }
  };

  const createSubscription = async (plan: Plan, trialDays = 14) => {
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

      const response = await fetch('/api/stripe/create-subscription', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          priceId: plan.id,
          trialDays
        })
      });

      const data = await response.json();

      if (data.success) {
        setSubscription(data.data);
        setClientSecret(data.data.clientSecret);
        setSelectedPlan(plan);
        
        if (onSubscriptionCreated) {
          onSubscriptionCreated(data.data);
        }
      } else {
        setError(data.message || 'Error al crear suscripción');
      }
    } catch (error) {
      console.error('Error creando suscripción:', error);
      setError('Error de conexión al crear suscripción');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async () => {
    if (!stripe || !elements || !clientSecret) {
      setError('Stripe no está listo para procesar el pago');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: stripeError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/billing/success`,
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Error al procesar el pago');
      }
    } catch (error) {
      console.error('Error confirmando pago:', error);
      setError('Error inesperado al procesar el pago');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatInterval = (interval: string, count: number) => {
    const intervalText = interval === 'month' ? 'mes' : 
                        interval === 'year' ? 'año' : interval;
    return count === 1 ? `por ${intervalText}` : `cada ${count} ${intervalText}es`;
  };

  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error de Configuración
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
                {error.includes('Stripe no está configurado') && (
                  <p className="mt-2">
                    Por favor, contacte al administrador para configurar la integración de pagos.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Elige tu Plan</h2>
          <p className="mt-4 text-lg text-gray-600">
            Selecciona el plan que mejor se adapte a las necesidades de tu empresa
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className="relative bg-white rounded-lg shadow-lg border-2 border-gray-200 hover:border-blue-500 transition-colors">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                
                <div className="mt-4">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatPrice(plan.amount, plan.currency)}
                  </span>
                  <span className="text-gray-600 ml-1">
                    {formatInterval(plan.interval, plan.interval_count)}
                  </span>
                </div>

                <button
                  onClick={() => createSubscription(plan)}
                  disabled={isLoading}
                  className="mt-6 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Procesando...' : 'Iniciar Prueba Gratuita'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">
              Los planes de suscripción se están cargando...
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Confirmar Suscripción</h2>
          <p className="mt-2 text-gray-600">
            Plan: {selectedPlan?.name} - {formatPrice(selectedPlan?.amount || 0, selectedPlan?.currency || 'USD')}
          </p>
          <p className="text-sm text-green-600 font-medium">
            ✓ 14 días de prueba gratuita incluidos
          </p>
        </div>

        {clientSecret && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Información de Pago
              </label>
              <PaymentElement />
            </div>

            <button
              onClick={confirmPayment}
              disabled={isLoading || !stripe || !elements}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isLoading ? 'Procesando...' : 'Confirmar Suscripción'}
            </button>

            <div className="text-xs text-gray-500 text-center">
              <p>
                Al confirmar, aceptas nuestros términos de servicio. 
                Tu suscripción comenzará después del período de prueba gratuita.
              </p>
              <p className="mt-1">
                Puedes cancelar en cualquier momento desde tu panel de control.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};