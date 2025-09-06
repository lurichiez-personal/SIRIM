// Proveedor de Stripe para manejar pagos y suscripciones
import React, { createContext, useContext, ReactNode } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

interface StripeContextType {
  isStripeReady: boolean;
  stripePublishableKey: string | null;
}

const StripeContext = createContext<StripeContextType>({
  isStripeReady: false,
  stripePublishableKey: null
});

export const useStripe = () => useContext(StripeContext);

interface StripeProviderProps {
  children: ReactNode;
  publishableKey?: string;
}

// Configuración de Stripe
const stripePublishableKey = (import.meta as any).env?.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

const appearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#3b82f6', // blue-500
    colorBackground: '#ffffff',
    colorText: '#1f2937', // gray-800
    colorDanger: '#ef4444', // red-500
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px',
  },
};

export const StripeProvider: React.FC<StripeProviderProps> = ({ 
  children, 
  publishableKey = stripePublishableKey 
}) => {
  const isStripeReady = Boolean(publishableKey && stripePromise);

  const contextValue: StripeContextType = {
    isStripeReady,
    stripePublishableKey: publishableKey
  };

  if (!isStripeReady) {
    return (
      <StripeContext.Provider value={contextValue}>
        {children}
      </StripeContext.Provider>
    );
  }

  return (
    <StripeContext.Provider value={contextValue}>
      <Elements 
        stripe={stripePromise} 
        options={{
          appearance,
          locale: 'es'
        }}
      >
        {children}
      </Elements>
    </StripeContext.Provider>
  );
};