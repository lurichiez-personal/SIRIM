// Rutas para integración con Stripe
const express = require("express");
const { authRequired } = require("../middleware/auth");
const prisma = require("../db");
const stripeService = require("../services/stripeService");
const emailService = require("../services/emailService");
const router = express.Router();

// Obtener planes disponibles de Stripe
router.get("/plans", async (req, res) => {
  try {
    const prices = await stripeService.getAvailablePrices();
    
    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    console.error("Error obteniendo planes Stripe:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener planes disponibles",
      error: error.message
    });
  }
});

// Crear suscripción Stripe para empresa
router.post("/create-subscription", authRequired, async (req, res) => {
  try {
    const { priceId, trialDays = 14 } = req.body;
    const { empresaId, email, nombre } = req.user;

    // Verificar si ya existe un cliente Stripe para esta empresa
    let stripeCustomerId;
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { nombre: true, rnc: true, stripeCustomerId: true }
    });

    if (!empresa) {
      return res.status(404).json({
        success: false,
        message: "Empresa no encontrada"
      });
    }

    // Crear cliente Stripe si no existe
    if (!empresa.stripeCustomerId) {
      const stripeCustomer = await stripeService.createCustomer({
        email,
        name: empresa.nombre,
        empresaId,
        rnc: empresa.rnc
      });

      stripeCustomerId = stripeCustomer.id;

      // Actualizar empresa con ID de cliente Stripe
      await prisma.empresa.update({
        where: { id: empresaId },
        data: { stripeCustomerId }
      });
    } else {
      stripeCustomerId = empresa.stripeCustomerId;
    }

    // Crear suscripción en Stripe
    const subscription = await stripeService.createSubscription(
      stripeCustomerId,
      priceId,
      trialDays
    );

    // Guardar información de suscripción en la base de datos
    const dbSubscription = await prisma.subscription.create({
      data: {
        empresaId,
        stripeSubscriptionId: subscription.subscriptionId,
        status: 'TRIAL', // Estado inicial durante período de prueba
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000),
        stripePriceId: priceId,
        trialEndsAt: new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)
      }
    });

    // Enviar notificación al master user
    await emailService.sendMail({
      to: 'lurichiez@gmail.com',
      subject: `Nueva Suscripción Iniciada - ${empresa.nombre}`,
      html: `
        <h2>Nueva Suscripción Stripe</h2>
        <p><strong>Empresa:</strong> ${empresa.nombre} (${empresa.rnc})</p>
        <p><strong>Usuario:</strong> ${nombre} (${email})</p>
        <p><strong>Período de prueba:</strong> ${trialDays} días</p>
        <p><strong>ID Suscripción Stripe:</strong> ${subscription.subscriptionId}</p>
        <p><strong>Estado:</strong> ${subscription.status}</p>
        <hr>
        <p>La empresa ha iniciado su período de prueba. Podrás ver los detalles en el panel de administración.</p>
      `
    });

    res.json({
      success: true,
      data: {
        subscriptionId: subscription.subscriptionId,
        clientSecret: subscription.clientSecret,
        status: subscription.status,
        trialEndsAt: dbSubscription.trialEndsAt
      },
      message: "Suscripción creada exitosamente"
    });

  } catch (error) {
    console.error("Error creando suscripción Stripe:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear suscripción",
      error: error.message
    });
  }
});

// Confirmar pago de suscripción
router.post("/confirm-payment", authRequired, async (req, res) => {
  try {
    const { subscriptionId, paymentMethodId } = req.body;
    const { empresaId } = req.user;

    // Verificar que la suscripción pertenece a la empresa
    const dbSubscription = await prisma.subscription.findFirst({
      where: {
        empresaId,
        stripeSubscriptionId: subscriptionId
      }
    });

    if (!dbSubscription) {
      return res.status(404).json({
        success: false,
        message: "Suscripción no encontrada"
      });
    }

    // Confirmar pago en Stripe
    const paymentResult = await stripeService.confirmSubscriptionPayment(
      subscriptionId,
      paymentMethodId
    );

    if (paymentResult.success) {
      // Actualizar estado de suscripción
      await prisma.subscription.update({
        where: { id: dbSubscription.id },
        data: {
          status: 'ACTIVE',
          activatedAt: new Date()
        }
      });

      // Registrar pago en la base de datos
      await prisma.payment.create({
        data: {
          subscriptionId: dbSubscription.id,
          stripePaymentIntentId: paymentResult.paymentIntent.id,
          amount: paymentResult.paymentIntent.amount / 100, // Stripe usa centavos
          currency: paymentResult.paymentIntent.currency.toUpperCase(),
          paymentMethod: 'STRIPE',
          status: 'COMPLETED',
          processedAt: new Date(),
          metadata: {
            stripePaymentIntent: paymentResult.paymentIntent
          }
        }
      });

      res.json({
        success: true,
        message: "Pago confirmado exitosamente",
        data: {
          status: 'ACTIVE',
          paymentIntent: paymentResult.paymentIntent
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Error al confirmar el pago",
        error: paymentResult.error
      });
    }

  } catch (error) {
    console.error("Error confirmando pago Stripe:", error);
    res.status(500).json({
      success: false,
      message: "Error al confirmar pago",
      error: error.message
    });
  }
});

// Cancelar suscripción
router.post("/cancel-subscription", authRequired, async (req, res) => {
  try {
    const { immediately = false } = req.body;
    const { empresaId } = req.user;

    // Obtener suscripción activa
    const subscription = await prisma.subscription.findFirst({
      where: {
        empresaId,
        status: { in: ['ACTIVE', 'TRIAL'] }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción activa"
      });
    }

    // Cancelar en Stripe
    const cancelledSubscription = await stripeService.cancelSubscription(
      subscription.stripeSubscriptionId,
      immediately
    );

    // Actualizar en base de datos
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: immediately ? 'CANCELLED' : 'PENDING_CANCELLATION',
        cancelledAt: immediately ? new Date() : null,
        cancellationDate: immediately ? null : new Date(cancelledSubscription.current_period_end * 1000)
      }
    });

    res.json({
      success: true,
      message: immediately 
        ? "Suscripción cancelada inmediatamente" 
        : "Suscripción programada para cancelación al final del período",
      data: {
        cancelledAt: immediately ? new Date() : null,
        endsAt: new Date(cancelledSubscription.current_period_end * 1000)
      }
    });

  } catch (error) {
    console.error("Error cancelando suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error al cancelar suscripción",
      error: error.message
    });
  }
});

// Obtener estado de suscripción actual
router.get("/subscription-status", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;

    const subscription = await prisma.subscription.findFirst({
      where: { empresaId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: { hasSubscription: false }
      });
    }

    // Obtener información actualizada de Stripe
    let stripeSubscription = null;
    if (subscription.stripeSubscriptionId) {
      try {
        stripeSubscription = await stripeService.getSubscription(subscription.stripeSubscriptionId);
      } catch (error) {
        console.warn("Error obteniendo suscripción de Stripe:", error.message);
      }
    }

    res.json({
      success: true,
      data: {
        hasSubscription: true,
        subscription: {
          ...subscription,
          stripeData: stripeSubscription
        }
      }
    });

  } catch (error) {
    console.error("Error obteniendo estado de suscripción:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estado de suscripción",
      error: error.message
    });
  }
});

// Webhook para eventos de Stripe
router.post("/webhook", express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event = stripeService.constructEvent(req.body, sig, endpointSecret);

    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error("Error procesando webhook Stripe:", error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});

// Funciones auxiliares para webhooks

async function handlePaymentSucceeded(invoice) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription }
    });

    if (subscription) {
      // Registrar pago exitoso
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_paid / 100,
          currency: invoice.currency.toUpperCase(),
          paymentMethod: 'STRIPE',
          status: 'COMPLETED',
          processedAt: new Date(),
          metadata: { stripeInvoice: invoice }
        }
      });

      // Actualizar suscripción si está en trial
      if (subscription.status === 'TRIAL') {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { 
            status: 'ACTIVE',
            activatedAt: new Date()
          }
        });
      }
    }
  } catch (error) {
    console.error("Error manejando pago exitoso:", error);
  }
}

async function handlePaymentFailed(invoice) {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { stripeSubscriptionId: invoice.subscription }
    });

    if (subscription) {
      // Registrar pago fallido
      await prisma.payment.create({
        data: {
          subscriptionId: subscription.id,
          stripeInvoiceId: invoice.id,
          amount: invoice.amount_due / 100,
          currency: invoice.currency.toUpperCase(),
          paymentMethod: 'STRIPE',
          status: 'FAILED',
          failureReason: 'Pago fallido en Stripe',
          metadata: { stripeInvoice: invoice }
        }
      });

      // Notificar al usuario y master
      // TODO: Implementar notificaciones de pago fallido
    }
  } catch (error) {
    console.error("Error manejando pago fallido:", error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: subscription.status.toUpperCase(),
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000)
      }
    });
  } catch (error) {
    console.error("Error actualizando suscripción:", error);
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date()
      }
    });
  } catch (error) {
    console.error("Error marcando suscripción como cancelada:", error);
  }
}

module.exports = router;