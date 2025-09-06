// src/routes/subscriptions.js
const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const prisma = require("../db");
const router = express.Router();

// Obtener planes de suscripción disponibles
router.get("/plans", async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      include: {
        modules: {
          include: {
            module: true
          }
        }
      },
      orderBy: { price: 'asc' }
    });

    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    console.error("Error fetching subscription plans:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener planes de suscripción",
      error: error.message
    });
  }
});

// Obtener suscripción actual de la empresa
router.get("/current", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;

    const subscription = await prisma.subscription.findUnique({
      where: { empresaId },
      include: {
        plan: true,
        modules: {
          include: {
            module: true
          }
        },
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        invoices: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción para esta empresa"
      });
    }

    res.json({
      success: true,
      data: subscription
    });
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener suscripción actual",
      error: error.message
    });
  }
});

// Crear nueva suscripción
router.post("/", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;
    const { planId, paymentMethodId, billingAddress } = req.body;

    // Verificar que no existe una suscripción activa
    const existingSubscription = await prisma.subscription.findUnique({
      where: { empresaId }
    });

    if (existingSubscription && existingSubscription.status !== 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: "La empresa ya tiene una suscripción activa"
      });
    }

    // Obtener el plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      include: {
        modules: {
          include: {
            module: true
          }
        }
      }
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Plan de suscripción no encontrado"
      });
    }

    // Calcular fechas
    const now = new Date();
    const trialEnd = new Date(now.getTime() + (plan.trialDays * 24 * 60 * 60 * 1000));
    const periodEnd = new Date(trialEnd.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 días después del trial

    // Crear suscripción
    const subscription = await prisma.subscription.create({
      data: {
        empresaId,
        planId,
        status: 'TRIAL',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        trialEnd,
        metadata: {
          paymentMethodId,
          billingAddress
        }
      },
      include: {
        plan: true
      }
    });

    // Activar módulos incluidos en el plan
    const modulePromises = plan.modules.map(planModule => 
      prisma.subscriptionModule.create({
        data: {
          subscriptionId: subscription.id,
          moduleId: planModule.moduleId,
          status: 'ACTIVE',
          additionalPrice: planModule.extraPrice
        }
      })
    );

    await Promise.all(modulePromises);

    res.status(201).json({
      success: true,
      data: subscription,
      message: "Suscripción creada exitosamente. ¡Disfruta de tu período de prueba!"
    });
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear suscripción",
      error: error.message
    });
  }
});

// Actualizar suscripción (cambiar plan)
router.put("/:subscriptionId/upgrade", authRequired, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { newPlanId } = req.body;
    const { empresaId } = req.user;

    // Verificar que la suscripción pertenece a la empresa
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        empresaId
      },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Suscripción no encontrada"
      });
    }

    const newPlan = await prisma.subscriptionPlan.findUnique({
      where: { id: newPlanId },
      include: {
        modules: {
          include: {
            module: true
          }
        }
      }
    });

    if (!newPlan) {
      return res.status(404).json({
        success: false,
        message: "Nuevo plan no encontrado"
      });
    }

    // Calcular prorreo si es necesario
    const proratedAmount = calculateProration(subscription, newPlan);

    // Actualizar suscripción
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId: newPlanId,
        updatedAt: new Date()
      },
      include: {
        plan: true,
        modules: {
          include: {
            module: true
          }
        }
      }
    });

    // Actualizar módulos según el nuevo plan
    await updateSubscriptionModules(subscriptionId, newPlan.modules);

    res.json({
      success: true,
      data: updatedSubscription,
      proratedAmount,
      message: "Suscripción actualizada exitosamente"
    });
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error al actualizar suscripción",
      error: error.message
    });
  }
});

// Cancelar suscripción
router.put("/:subscriptionId/cancel", authRequired, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { empresaId } = req.user;
    const { cancelAtPeriodEnd = true } = req.body;

    const subscription = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        empresaId
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Suscripción no encontrada"
      });
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        cancelAtPeriodEnd,
        status: cancelAtPeriodEnd ? subscription.status : 'CANCELLED',
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      data: updatedSubscription,
      message: cancelAtPeriodEnd 
        ? "La suscripción se cancelará al final del período actual"
        : "Suscripción cancelada inmediatamente"
    });
  } catch (error) {
    console.error("Error canceling subscription:", error);
    res.status(500).json({
      success: false,
      message: "Error al cancelar suscripción",
      error: error.message
    });
  }
});

// Funciones auxiliares
function calculateProration(currentSubscription, newPlan) {
  // Implementar lógica de cálculo de prorreo
  // Esta es una implementación básica
  const daysRemaining = Math.ceil((new Date(currentSubscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24));
  const totalDays = 30; // Asumiendo ciclo mensual
  const proratedRatio = daysRemaining / totalDays;
  
  const currentPlanPrice = parseFloat(currentSubscription.plan.price);
  const newPlanPrice = parseFloat(newPlan.price);
  
  return (newPlanPrice - currentPlanPrice) * proratedRatio;
}

async function updateSubscriptionModules(subscriptionId, newPlanModules) {
  // Desactivar todos los módulos actuales
  await prisma.subscriptionModule.updateMany({
    where: { subscriptionId },
    data: { status: 'INACTIVE' }
  });

  // Activar módulos del nuevo plan
  for (const planModule of newPlanModules) {
    await prisma.subscriptionModule.upsert({
      where: {
        subscriptionId_moduleId: {
          subscriptionId,
          moduleId: planModule.moduleId
        }
      },
      update: {
        status: 'ACTIVE',
        additionalPrice: planModule.extraPrice
      },
      create: {
        subscriptionId,
        moduleId: planModule.moduleId,
        status: 'ACTIVE',
        additionalPrice: planModule.extraPrice
      }
    });
  }
}

module.exports = router;