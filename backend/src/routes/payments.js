// src/routes/payments.js
const express = require("express");
const { authRequired } = require("../middleware/auth");
const prisma = require("../db");
const router = express.Router();

// Procesar pago recurrente
router.post("/process-recurring", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;
    const { subscriptionId, paymentMethodId, saveCard = false } = req.body;

    // Obtener suscripción
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        empresaId
      },
      include: {
        plan: true,
        modules: {
          where: { status: 'ACTIVE' },
          include: { module: true }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Suscripción no encontrada"
      });
    }

    // Calcular monto total
    const baseAmount = parseFloat(subscription.plan.price);
    const additionalModulesAmount = subscription.modules.reduce((total, subModule) => {
      return total + (subModule.additionalPrice ? parseFloat(subModule.additionalPrice) : 0);
    }, 0);
    
    const subtotal = baseAmount + additionalModulesAmount;
    const itbis = subtotal * 0.18; // 18% ITBIS en República Dominicana
    const totalAmount = subtotal + itbis;

    // Crear registro de pago
    const payment = await prisma.payment.create({
      data: {
        subscriptionId: subscription.id,
        amount: totalAmount,
        currency: "DOP",
        paymentMethod: "CREDIT_CARD", // Esto se determinará por el procesador
        status: "PENDING",
        metadata: {
          paymentMethodId,
          saveCard,
          breakdown: {
            planPrice: baseAmount,
            additionalModules: additionalModulesAmount,
            subtotal,
            itbis,
            total: totalAmount
          }
        }
      }
    });

    // Aquí iría la integración con el procesador de pagos dominicano
    // Por ahora simularemos el procesamiento
    const paymentResult = await processPaymentWithDominicanProcessor({
      amount: totalAmount,
      currency: "DOP",
      paymentMethodId,
      description: `Suscripción SIRIM - ${subscription.plan.name}`,
      customer: {
        empresaId,
        email: req.user.email
      }
    });

    if (paymentResult.success) {
      // Actualizar pago como exitoso
      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          azulTransactionId: paymentResult.transactionId,
          cardLast4: paymentResult.cardLast4,
          cardBrand: paymentResult.cardBrand,
          metadata: {
            ...payment.metadata,
            processorResponse: paymentResult
          }
        }
      });

      // Generar factura
      const invoice = await generateInvoice(subscription, updatedPayment, subtotal, itbis);

      // Actualizar período de suscripción
      await updateSubscriptionPeriod(subscription.id);

      res.json({
        success: true,
        data: {
          payment: updatedPayment,
          invoice
        },
        message: "Pago procesado exitosamente"
      });
    } else {
      // Actualizar pago como fallido
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          failureReason: paymentResult.error,
          nextRetryAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Reintentar en 24 horas
        }
      });

      res.status(400).json({
        success: false,
        message: "Error al procesar el pago",
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error("Error processing recurring payment:", error);
    res.status(500).json({
      success: false,
      message: "Error interno al procesar el pago",
      error: error.message
    });
  }
});

// Obtener historial de pagos
router.get("/history", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const subscription = await prisma.subscription.findUnique({
      where: { empresaId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción"
      });
    }

    const payments = await prisma.payment.findMany({
      where: { subscriptionId: subscription.id },
      include: {
        invoice: true
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    const total = await prisma.payment.count({
      where: { subscriptionId: subscription.id }
    });

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener historial de pagos",
      error: error.message
    });
  }
});

// Reintentar pago fallido
router.post("/:paymentId/retry", authRequired, async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { empresaId } = req.user;

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        subscription: {
          empresaId
        }
      },
      include: {
        subscription: {
          include: {
            plan: true
          }
        }
      }
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Pago no encontrado"
      });
    }

    if (payment.status !== 'FAILED') {
      return res.status(400).json({
        success: false,
        message: "Solo se pueden reintentar pagos fallidos"
      });
    }

    // Incrementar contador de reintentos
    if (payment.retryCount >= 3) {
      return res.status(400).json({
        success: false,
        message: "Se ha alcanzado el límite máximo de reintentos"
      });
    }

    // Procesar pago nuevamente
    const paymentResult = await processPaymentWithDominicanProcessor({
      amount: parseFloat(payment.amount),
      currency: payment.currency,
      paymentMethodId: payment.metadata?.paymentMethodId,
      description: `Reintento - Suscripción SIRIM - ${payment.subscription.plan.name}`,
      customer: {
        empresaId
      }
    });

    if (paymentResult.success) {
      const updatedPayment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
          retryCount: { increment: 1 },
          azulTransactionId: paymentResult.transactionId,
          metadata: {
            ...payment.metadata,
            retryProcessorResponse: paymentResult
          }
        }
      });

      res.json({
        success: true,
        data: updatedPayment,
        message: "Pago reintentado exitosamente"
      });
    } else {
      await prisma.payment.update({
        where: { id: paymentId },
        data: {
          retryCount: { increment: 1 },
          failureReason: paymentResult.error,
          nextRetryAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // Próximo reintento en 48 horas
        }
      });

      res.status(400).json({
        success: false,
        message: "Error en el reintento del pago",
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error("Error retrying payment:", error);
    res.status(500).json({
      success: false,
      message: "Error al reintentar el pago",
      error: error.message
    });
  }
});

// Funciones auxiliares

async function processPaymentWithDominicanProcessor(paymentData) {
  // Esta función simula la integración con procesadores dominicanos
  // En producción, aquí iría la integración real con Azul, Cardnet, o Visanet
  
  try {
    // Simulación de procesamiento
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simular respuesta exitosa (90% de éxito)
    if (Math.random() > 0.1) {
      return {
        success: true,
        transactionId: `AZ${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        cardLast4: "4242",
        cardBrand: "visa",
        amount: paymentData.amount,
        currency: paymentData.currency,
        processingFee: paymentData.amount * 0.035, // 3.5% fee típico en RD
        netAmount: paymentData.amount * 0.965
      };
    } else {
      return {
        success: false,
        error: "Fondos insuficientes en la tarjeta"
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Error de conexión con el procesador de pagos"
    };
  }
}

async function generateInvoice(subscription, payment, subtotal, itbis) {
  const invoiceNumber = `SIRIM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  
  // Generar NCF (simulado - en producción esto vendría de la DGII)
  const ncf = `B0100000${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;

  const invoice = await prisma.subscriptionInvoice.create({
    data: {
      subscriptionId: subscription.id,
      paymentId: payment.id,
      invoiceNumber,
      amount: subtotal,
      currency: payment.currency,
      itbis,
      totalAmount: parseFloat(payment.amount),
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      dueDate: new Date(),
      paidAt: new Date(),
      ncf,
      ncfSequence: "B01",
      items: {
        plan: {
          name: subscription.plan.name,
          amount: parseFloat(subscription.plan.price)
        },
        modules: subscription.modules.map(mod => ({
          name: mod.module.displayName,
          amount: mod.additionalPrice ? parseFloat(mod.additionalPrice) : 0
        }))
      }
    }
  });

  return invoice;
}

async function updateSubscriptionPeriod(subscriptionId) {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId }
  });

  const newPeriodStart = new Date(subscription.currentPeriodEnd);
  const newPeriodEnd = new Date(newPeriodStart.getTime() + (30 * 24 * 60 * 60 * 1000));

  await prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      status: 'ACTIVE'
    }
  });
}

module.exports = router;