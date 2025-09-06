// Servicio de integración con Stripe para suscripciones
const stripe = process.env.STRIPE_SECRET_KEY 
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

class StripeService {
  // Verificar si Stripe está configurado
  _checkStripeAvailable() {
    if (!stripe) {
      throw new Error('Stripe no está configurado. Por favor, configure STRIPE_SECRET_KEY en las variables de entorno.');
    }
  }

  // Crear cliente en Stripe
  async createCustomer(customerData) {
    this._checkStripeAvailable();
    try {
      const customer = await stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        metadata: {
          empresaId: customerData.empresaId,
          rnc: customerData.rnc
        }
      });
      
      return customer;
    } catch (error) {
      console.error('Error creando cliente Stripe:', error);
      throw new Error('Error al crear cliente en Stripe');
    }
  }

  // Crear suscripción con período de prueba
  async createSubscription(customerId, priceId, trialDays = 14) {
    this._checkStripeAvailable();
    try {
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription',
          payment_method_types: ['card']
        },
        trial_period_days: trialDays,
        expand: ['latest_invoice.payment_intent']
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent?.client_secret,
        status: subscription.status
      };
    } catch (error) {
      console.error('Error creando suscripción:', error);
      throw new Error('Error al crear suscripción');
    }
  }

  // Confirmar pago de suscripción
  async confirmSubscriptionPayment(subscriptionId, paymentMethodId) {
    this._checkStripeAvailable();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      
      if (subscription.latest_invoice) {
        const invoice = await stripe.invoices.retrieve(subscription.latest_invoice.id);
        
        if (invoice.payment_intent) {
          const paymentIntent = await stripe.paymentIntents.confirm(
            invoice.payment_intent.id,
            { payment_method: paymentMethodId }
          );
          
          return {
            success: paymentIntent.status === 'succeeded',
            paymentIntent
          };
        }
      }
      
      return { success: false, error: 'No se pudo procesar el pago' };
    } catch (error) {
      console.error('Error confirmando pago:', error);
      throw new Error('Error al confirmar pago');
    }
  }

  // Obtener precios/planes disponibles
  async getAvailablePrices() {
    this._checkStripeAvailable();
    try {
      const prices = await stripe.prices.list({
        active: true,
        expand: ['data.product']
      });
      
      return prices.data.map(price => ({
        id: price.id,
        amount: price.unit_amount,
        currency: price.currency,
        interval: price.recurring?.interval,
        interval_count: price.recurring?.interval_count,
        product: {
          id: price.product.id,
          name: price.product.name,
          description: price.product.description
        }
      }));
    } catch (error) {
      console.error('Error obteniendo precios:', error);
      throw new Error('Error al obtener planes disponibles');
    }
  }

  // Cancelar suscripción
  async cancelSubscription(subscriptionId, immediately = false) {
    this._checkStripeAvailable();
    try {
      if (immediately) {
        const subscription = await stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      } else {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        return subscription;
      }
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      throw new Error('Error al cancelar suscripción');
    }
  }

  // Obtener información de suscripción
  async getSubscription(subscriptionId) {
    this._checkStripeAvailable();
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ['customer', 'default_payment_method']
      });
      
      return subscription;
    } catch (error) {
      console.error('Error obteniendo suscripción:', error);
      throw new Error('Error al obtener información de suscripción');
    }
  }

  // Webhook handler para eventos de Stripe
  constructEvent(payload, signature, endpointSecret) {
    this._checkStripeAvailable();
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, endpointSecret);
      return event;
    } catch (error) {
      console.error('Error validando webhook:', error);
      throw new Error('Webhook signature verification failed');
    }
  }
}

module.exports = new StripeService();