// Página de checkout con integración Stripe
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { StripeProvider } from '../billing/StripeProvider';
import { useElements, useStripe, PaymentElement } from '@stripe/react-stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';

interface CheckoutFormProps {
  plan: string;
  isTrial: boolean;
  registrationData: any;
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ plan, isTrial, registrationData }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [error, setError] = useState<string>('');

  const planDetails = {
    basico: { name: 'Plan Básico', price: 25, features: ['Facturación básica', 'Reportes DGII', 'Soporte por email'] },
    pro: { name: 'Plan Pro', price: 45, features: ['Todo lo del Básico +', 'Inventario', 'Gastos con IA', 'Contabilidad automática'] },
    premium: { name: 'Plan Premium', price: 75, features: ['Todo lo del Pro +', 'Nómina completa', 'Portal de clientes', 'Soporte prioritario'] }
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails] || planDetails.basico;

  useEffect(() => {
    if (!isTrial) {
      createPaymentIntent();
    }
  }, []);

  const createPaymentIntent = async () => {
    try {
      const response = await fetch('/api/stripe/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: plan,
          registrationData: registrationData,
          amount: currentPlan.price * 100 // Stripe uses cents
        })
      });

      const data = await response.json();
      if (data.success) {
        setClientSecret(data.clientSecret);
      } else {
        setError(data.message || 'Error al crear el payment intent');
      }
    } catch (err) {
      setError('Error de conexión');
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) return;
    
    setIsLoading(true);
    setError('');

    try {
      if (isTrial) {
        // Solo registrar sin pago
        const registrationResponse = await fetch('/api/registration/register-company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData)
        });

        const registrationResult = await registrationResponse.json();
        
        if (!registrationResult.message) {
          throw new Error(registrationResult.error || 'Error en el registro');
        }

        navigate('/dashboard', { 
          state: { message: 'Registro exitoso. Tu período de prueba de 30 días ha comenzado.' }
        });
        return;
      }

      // Procesar pago para compra directa
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/#/dashboard/billing/success`,
        },
        redirect: 'if_required'
      });

      if (stripeError) {
        setError(stripeError.message || 'Error al procesar el pago');
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Registrar empresa con pago exitoso
        const registrationResponse = await fetch('/api/registration/register-company-with-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...registrationData,
            plan: plan,
            paymentIntentId: paymentIntent.id
          })
        });

        const registrationResult = await registrationResponse.json();
        
        if (!registrationResult.message) {
          throw new Error(registrationResult.error || 'Error en el registro');
        }

        navigate('/dashboard', { 
          state: { 
            message: 'Pago exitoso y cuenta creada. ¡Bienvenido a SIRIM!',
            paymentSuccess: true 
          }
        });
      }
    } catch (err: any) {
      setError(err.message || 'Error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isTrial ? `Prueba Gratuita - ${currentPlan.name}` : `Comprar ${currentPlan.name}`}
          </CardTitle>
          <div className="mt-4">
            <span className="text-4xl font-bold">${currentPlan.price}</span>
            <span className="text-lg text-gray-600"> / mes</span>
          </div>
          {isTrial && (
            <p className="text-green-600 font-medium mt-2">
              ✓ 30 días gratuitos - No se requiere tarjeta de crédito
            </p>
          )}
        </CardHeader>

        <CardContent>
          <div className="mb-6">
            <h3 className="font-semibold mb-3">Características incluidas:</h3>
            <ul className="space-y-2">
              {currentPlan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Datos de la empresa:</h4>
              <p><strong>Empresa:</strong> {registrationData.nombreEmpresa}</p>
              <p><strong>RNC:</strong> {registrationData.rnc}</p>
              <p><strong>Usuario:</strong> {registrationData.nombreUsuario} ({registrationData.email})</p>
            </div>

            {!isTrial && clientSecret && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Información de Pago
                </label>
                <PaymentElement />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || (!isTrial && (!stripe || !elements))}
            >
              {isLoading ? 'Procesando...' : (
                isTrial ? 'Iniciar Prueba Gratuita' : `Pagar $${currentPlan.price}/mes`
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              {isTrial ? (
                'Tu prueba gratuita terminará en 30 días. Podrás cancelar en cualquier momento.'
              ) : (
                'Se cobrará mensualmente. Puedes cancelar en cualquier momento desde tu panel de control.'
              )}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [registrationData, setRegistrationData] = useState<any>(null);

  const plan = searchParams.get('plan') || 'basico';
  const trial = searchParams.get('trial') === 'true';

  useEffect(() => {
    // Verificar si tenemos datos de registro en sessionStorage
    const storedData = sessionStorage.getItem('registrationData');
    if (storedData) {
      setRegistrationData(JSON.parse(storedData));
    } else {
      // Redirigir al registro si no hay datos
      navigate(`/registro?plan=${plan}&trial=${trial}`);
    }
  }, [plan, trial, navigate]);

  if (!registrationData) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4">Cargando...</p>
      </div>
    );
  }

  return (
    <StripeProvider>
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto">
          <CheckoutForm 
            plan={plan} 
            isTrial={trial} 
            registrationData={registrationData} 
          />
        </div>
      </div>
    </StripeProvider>
  );
};

export default CheckoutPage;