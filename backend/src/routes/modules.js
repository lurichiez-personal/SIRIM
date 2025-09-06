// src/routes/modules.js
const express = require("express");
const { authRequired, requireRole } = require("../middleware/auth");
const prisma = require("../db");
const router = express.Router();

// Obtener todos los módulos disponibles
router.get("/", async (req, res) => {
  try {
    const modules = await prisma.module.findMany({
      where: { active: true },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' }
      ]
    });

    // Agrupar módulos por categoría
    const modulesByCategory = modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        modules,
        categories: modulesByCategory
      }
    });
  } catch (error) {
    console.error("Error fetching modules:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener módulos",
      error: error.message
    });
  }
});

// Obtener módulos activos para la empresa actual
router.get("/active", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;

    const subscription = await prisma.subscription.findUnique({
      where: { empresaId },
      include: {
        modules: {
          where: { status: 'ACTIVE' },
          include: {
            module: true
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción activa"
      });
    }

    const activeModules = subscription.modules.map(subModule => ({
      ...subModule.module,
      subscriptionStatus: subModule.status,
      activatedAt: subModule.activatedAt,
      expiresAt: subModule.expiresAt,
      additionalPrice: subModule.additionalPrice,
      settings: subModule.settings
    }));

    res.json({
      success: true,
      data: activeModules
    });
  } catch (error) {
    console.error("Error fetching active modules:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener módulos activos",
      error: error.message
    });
  }
});

// Activar un módulo adicional
router.post("/:moduleId/activate", authRequired, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { empresaId } = req.user;
    const { trialDays = 7 } = req.body;

    // Verificar que existe la suscripción
    const subscription = await prisma.subscription.findUnique({
      where: { empresaId },
      include: { plan: true }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción activa"
      });
    }

    // Verificar que el módulo existe y está activo
    const module = await prisma.module.findUnique({
      where: { id: moduleId }
    });

    if (!module || !module.active) {
      return res.status(404).json({
        success: false,
        message: "Módulo no encontrado o no disponible"
      });
    }

    // Verificar que el módulo no esté ya activo
    const existingSubscriptionModule = await prisma.subscriptionModule.findUnique({
      where: {
        subscriptionId_moduleId: {
          subscriptionId: subscription.id,
          moduleId
        }
      }
    });

    if (existingSubscriptionModule && existingSubscriptionModule.status === 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: "El módulo ya está activo en la suscripción"
      });
    }

    // Verificar si el módulo está incluido en el plan actual
    const planModule = await prisma.planModule.findUnique({
      where: {
        planId_moduleId: {
          planId: subscription.planId,
          moduleId
        }
      }
    });

    const now = new Date();
    const trialEnd = new Date(now.getTime() + (trialDays * 24 * 60 * 60 * 1000));

    let subscriptionModule;

    if (existingSubscriptionModule) {
      // Reactivar módulo existente
      subscriptionModule = await prisma.subscriptionModule.update({
        where: { id: existingSubscriptionModule.id },
        data: {
          status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
          activatedAt: now,
          expiresAt: trialDays > 0 ? trialEnd : null,
          additionalPrice: planModule?.included ? null : module.basePrice
        }
      });
    } else {
      // Crear nuevo módulo de suscripción
      subscriptionModule = await prisma.subscriptionModule.create({
        data: {
          subscriptionId: subscription.id,
          moduleId,
          status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
          activatedAt: now,
          expiresAt: trialDays > 0 ? trialEnd : null,
          additionalPrice: planModule?.included ? null : module.basePrice
        }
      });
    }

    // Registrar activación en el tracking de uso
    await prisma.moduleUsage.create({
      data: {
        empresaId,
        moduleId,
        usageType: 'activation',
        metadata: {
          action: 'module_activated',
          trialDays: trialDays > 0 ? trialDays : null,
          additionalPrice: subscriptionModule.additionalPrice
        }
      }
    });

    const result = await prisma.subscriptionModule.findUnique({
      where: { id: subscriptionModule.id },
      include: {
        module: true
      }
    });

    res.json({
      success: true,
      data: result,
      message: trialDays > 0 
        ? `Módulo activado con ${trialDays} días de prueba gratuita`
        : "Módulo activado exitosamente"
    });
  } catch (error) {
    console.error("Error activating module:", error);
    res.status(500).json({
      success: false,
      message: "Error al activar módulo",
      error: error.message
    });
  }
});

// Desactivar un módulo
router.post("/:moduleId/deactivate", authRequired, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { empresaId } = req.user;

    const subscription = await prisma.subscription.findUnique({
      where: { empresaId }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción activa"
      });
    }

    const subscriptionModule = await prisma.subscriptionModule.findUnique({
      where: {
        subscriptionId_moduleId: {
          subscriptionId: subscription.id,
          moduleId
        }
      },
      include: { module: true }
    });

    if (!subscriptionModule) {
      return res.status(404).json({
        success: false,
        message: "Módulo no encontrado en la suscripción"
      });
    }

    // Verificar si es un módulo core que no se puede desactivar
    if (subscriptionModule.module.isCore) {
      return res.status(400).json({
        success: false,
        message: "No se pueden desactivar módulos principales del sistema"
      });
    }

    const updatedSubscriptionModule = await prisma.subscriptionModule.update({
      where: { id: subscriptionModule.id },
      data: {
        status: 'INACTIVE',
        updatedAt: new Date()
      },
      include: { module: true }
    });

    // Registrar desactivación
    await prisma.moduleUsage.create({
      data: {
        empresaId,
        moduleId,
        usageType: 'deactivation',
        metadata: {
          action: 'module_deactivated',
          previousStatus: subscriptionModule.status
        }
      }
    });

    res.json({
      success: true,
      data: updatedSubscriptionModule,
      message: "Módulo desactivado exitosamente"
    });
  } catch (error) {
    console.error("Error deactivating module:", error);
    res.status(500).json({
      success: false,
      message: "Error al desactivar módulo",
      error: error.message
    });
  }
});

// Obtener estadísticas de uso de módulos
router.get("/usage-stats", authRequired, async (req, res) => {
  try {
    const { empresaId } = req.user;
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const usageStats = await prisma.moduleUsage.findMany({
      where: {
        empresaId,
        ...(Object.keys(dateFilter).length > 0 && { recordedAt: dateFilter })
      },
      include: {
        module: true
      },
      orderBy: { recordedAt: 'desc' }
    });

    // Agrupar estadísticas por módulo
    const statsByModule = usageStats.reduce((acc, usage) => {
      const moduleId = usage.moduleId;
      if (!acc[moduleId]) {
        acc[moduleId] = {
          module: usage.module,
          totalUsage: 0,
          usageByType: {},
          lastUsed: null
        };
      }
      
      acc[moduleId].totalUsage += usage.quantity;
      
      if (!acc[moduleId].usageByType[usage.usageType]) {
        acc[moduleId].usageByType[usage.usageType] = 0;
      }
      acc[moduleId].usageByType[usage.usageType] += usage.quantity;
      
      if (!acc[moduleId].lastUsed || usage.recordedAt > acc[moduleId].lastUsed) {
        acc[moduleId].lastUsed = usage.recordedAt;
      }
      
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        rawUsage: usageStats,
        statsByModule: Object.values(statsByModule)
      }
    });
  } catch (error) {
    console.error("Error fetching usage stats:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas de uso",
      error: error.message
    });
  }
});

// Verificar límites de uso de un módulo
router.get("/:moduleId/usage-limits", authRequired, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { empresaId } = req.user;

    const subscription = await prisma.subscription.findUnique({
      where: { empresaId },
      include: {
        plan: {
          include: {
            modules: {
              where: { moduleId }
            }
          }
        }
      }
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "No se encontró suscripción activa"
      });
    }

    const planModule = subscription.plan.modules[0];
    
    if (!planModule) {
      return res.status(404).json({
        success: false,
        message: "Módulo no encontrado en el plan actual"
      });
    }

    // Obtener uso actual del mes
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const currentUsage = await prisma.moduleUsage.aggregate({
      where: {
        empresaId,
        moduleId,
        recordedAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: {
        quantity: true
      }
    });

    const usedQuantity = currentUsage._sum.quantity || 0;
    const maxUsage = planModule.maxUsage;

    res.json({
      success: true,
      data: {
        module: planModule.module,
        limits: {
          maxUsage,
          usedQuantity,
          remainingQuantity: maxUsage ? Math.max(0, maxUsage - usedQuantity) : null,
          isUnlimited: !maxUsage,
          usagePercentage: maxUsage ? Math.min(100, (usedQuantity / maxUsage) * 100) : null
        },
        period: {
          startOfMonth,
          endOfMonth
        }
      }
    });
  } catch (error) {
    console.error("Error checking usage limits:", error);
    res.status(500).json({
      success: false,
      message: "Error al verificar límites de uso",
      error: error.message
    });
  }
});

module.exports = router;