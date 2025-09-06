const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// CONFIGURACIÓN DE PRECIOS
// ============================================

// Obtener configuración actual de precios
router.get('/pricing', async (req, res) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        modules: {
          include: {
            module: true
          }
        }
      },
      orderBy: { price: 'asc' }
    });

    const modules = await prisma.module.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({ plans, modules });
  } catch (error) {
    console.error('Error fetching pricing config:', error);
    res.status(500).json({ error: 'Error al obtener configuración de precios' });
  }
});

// Actualizar precio de un plan
router.put('/pricing/plan/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, description } = req.body;

    const updatedPlan = await prisma.subscriptionPlan.update({
      where: { id: id },
      data: {
        price: parseFloat(price),
        description
      }
    });

    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan price:', error);
    res.status(500).json({ error: 'Error al actualizar precio del plan' });
  }
});

// Actualizar precio de un módulo
router.put('/pricing/module/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price } = req.body;

    const updatedModule = await prisma.module.update({
      where: { id: parseInt(id) },
      data: {
        price: parseFloat(price)
      }
    });

    res.json(updatedModule);
  } catch (error) {
    console.error('Error updating module price:', error);
    res.status(500).json({ error: 'Error al actualizar precio del módulo' });
  }
});

// ============================================
// CONFIGURACIÓN DEL LANDING PAGE
// ============================================

// Obtener configuración actual del landing page
router.get('/landing-config', async (req, res) => {
  try {
    // Buscar configuración existente o crear una por defecto
    let config = await prisma.landingConfig.findFirst();
    
    if (!config) {
      // Crear configuración por defecto
      config = await prisma.landingConfig.create({
        data: {
          heroTitle: 'La Contabilidad de tu Negocio, Simplificada.',
          heroSubtitle: 'SIRIM es la plataforma todo-en-uno para la gestión de impuestos y contabilidad en República Dominicana. Facturación, gastos, reportes DGII y más, en un solo lugar.',
          heroButtonText: 'Empieza tu prueba de 30 días',
          pricingTitle: 'Planes para cada etapa de tu negocio',
          pricingSubtitle: 'Empieza con una prueba gratuita de 30 días en cualquier plan. Sin tarjeta de crédito.',
          trialDays: 30,
          moduleTrialDays: 7,
          supportEmail: 'soporte@sirim.do',
          supportPhone: '+1 (809) 123-4567'
        }
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error fetching landing config:', error);
    res.status(500).json({ error: 'Error al obtener configuración del landing page' });
  }
});

// Actualizar configuración del landing page
router.put('/landing-config', async (req, res) => {
  try {
    const {
      heroTitle,
      heroSubtitle,
      heroButtonText,
      pricingTitle,
      pricingSubtitle,
      trialDays,
      moduleTrialDays,
      supportEmail,
      supportPhone
    } = req.body;

    // Buscar configuración existente
    let config = await prisma.landingConfig.findFirst();
    
    if (config) {
      // Actualizar existente
      config = await prisma.landingConfig.update({
        where: { id: config.id },
        data: {
          heroTitle,
          heroSubtitle,
          heroButtonText,
          pricingTitle,
          pricingSubtitle,
          trialDays: parseInt(trialDays),
          moduleTrialDays: parseInt(moduleTrialDays),
          supportEmail,
          supportPhone,
          updatedAt: new Date()
        }
      });
    } else {
      // Crear nueva
      config = await prisma.landingConfig.create({
        data: {
          heroTitle,
          heroSubtitle,
          heroButtonText,
          pricingTitle,
          pricingSubtitle,
          trialDays: parseInt(trialDays),
          moduleTrialDays: parseInt(moduleTrialDays),
          supportEmail,
          supportPhone
        }
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating landing config:', error);
    res.status(500).json({ error: 'Error al actualizar configuración del landing page' });
  }
});

module.exports = router;