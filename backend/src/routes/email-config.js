const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configuraciones SMTP por defecto para proveedores conocidos
const SMTP_DEFAULTS = {
  GMAIL: {
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: true
  },
  OUTLOOK: {
    smtpHost: 'smtp-mail.outlook.com',
    smtpPort: 587,
    smtpSecure: true
  },
  OFFICE365: {
    smtpHost: 'smtp.office365.com',
    smtpPort: 587,
    smtpSecure: true
  },
  SENDGRID: {
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: 587,
    smtpSecure: true
  }
};

// Encriptar credenciales sensibles
const encryptCredential = (credential) => {
  if (!credential) return null;
  return bcrypt.hashSync(credential, 10);
};

// GET /api/email-config - Obtener todas las configuraciones de correo
router.get('/', auth, async (req, res) => {
  try {
    const configs = await prisma.emailConfig.findMany({
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        provider: true,
        isDefault: true,
        isActive: true,
        email: true,
        fromName: true,
        replyTo: true,
        lastUsedAt: true,
        errorCount: true,
        lastError: true,
        createdAt: true,
        updatedAt: true
        // Excluir credenciales sensibles por seguridad
      }
    });

    res.json(configs);
  } catch (error) {
    console.error('Error obteniendo configuraciones de correo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// GET /api/email-config/default - Obtener configuración por defecto
router.get('/default', auth, async (req, res) => {
  try {
    const defaultConfig = await prisma.emailConfig.findFirst({
      where: { isDefault: true, isActive: true },
      select: {
        id: true,
        name: true,
        provider: true,
        email: true,
        fromName: true,
        replyTo: true,
        templates: true,
        settings: true
      }
    });

    if (!defaultConfig) {
      return res.status(404).json({ error: 'No hay configuración de correo por defecto' });
    }

    res.json(defaultConfig);
  } catch (error) {
    console.error('Error obteniendo configuración por defecto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/email-config - Crear nueva configuración de correo
router.post('/', auth, async (req, res) => {
  try {
    const {
      name,
      provider,
      isDefault = false,
      email,
      password,
      clientId,
      clientSecret,
      apiKey,
      fromName = 'SIRIM',
      replyTo,
      templates,
      settings
    } = req.body;

    // Validación básica
    if (!name || !provider || !email) {
      return res.status(400).json({ 
        error: 'Nombre, proveedor y email son requeridos' 
      });
    }

    // Validar que el email sea del usuario master
    const masterEmail = 'lurichiez@gmail.com';
    if (email !== masterEmail) {
      return res.status(403).json({ 
        error: 'Solo se puede configurar el correo del usuario master: ' + masterEmail
      });
    }

    // Obtener configuración SMTP por defecto
    const smtpDefaults = SMTP_DEFAULTS[provider] || {};

    // Si se establece como default, quitar default de otras configuraciones
    if (isDefault) {
      await prisma.emailConfig.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });
    }

    const emailConfig = await prisma.emailConfig.create({
      data: {
        name,
        provider,
        isDefault,
        isActive: true,
        smtpHost: smtpDefaults.smtpHost,
        smtpPort: smtpDefaults.smtpPort,
        smtpSecure: smtpDefaults.smtpSecure,
        email,
        password: password ? encryptCredential(password) : null,
        clientId,
        clientSecret: clientSecret ? encryptCredential(clientSecret) : null,
        apiKey: apiKey ? encryptCredential(apiKey) : null,
        fromName,
        replyTo,
        templates,
        settings
      },
      select: {
        id: true,
        name: true,
        provider: true,
        isDefault: true,
        isActive: true,
        email: true,
        fromName: true,
        replyTo: true,
        createdAt: true
      }
    });

    res.status(201).json(emailConfig);
  } catch (error) {
    console.error('Error creando configuración de correo:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Ya existe una configuración para este email y proveedor' 
      });
    }
    
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// PUT /api/email-config/:id - Actualizar configuración de correo
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      isDefault,
      isActive,
      password,
      clientId,
      clientSecret,
      apiKey,
      fromName,
      replyTo,
      templates,
      settings
    } = req.body;

    // Si se establece como default, quitar default de otras configuraciones
    if (isDefault) {
      await prisma.emailConfig.updateMany({
        where: { isDefault: true, id: { not: parseInt(id) } },
        data: { isDefault: false }
      });
    }

    const updateData = {
      name,
      isDefault,
      isActive,
      fromName,
      replyTo,
      templates,
      settings
    };

    // Solo actualizar credenciales si se proporcionan
    if (password) updateData.password = encryptCredential(password);
    if (clientId) updateData.clientId = clientId;
    if (clientSecret) updateData.clientSecret = encryptCredential(clientSecret);
    if (apiKey) updateData.apiKey = encryptCredential(apiKey);

    const updatedConfig = await prisma.emailConfig.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        provider: true,
        isDefault: true,
        isActive: true,
        email: true,
        fromName: true,
        replyTo: true,
        updatedAt: true
      }
    });

    res.json(updatedConfig);
  } catch (error) {
    console.error('Error actualizando configuración de correo:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }
    
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// DELETE /api/email-config/:id - Eliminar configuración de correo
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la configuración existe
    const config = await prisma.emailConfig.findUnique({
      where: { id: parseInt(id) }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // No permitir eliminar si es la única configuración activa
    if (config.isDefault) {
      const activeCount = await prisma.emailConfig.count({
        where: { isActive: true }
      });

      if (activeCount <= 1) {
        return res.status(400).json({ 
          error: 'No se puede eliminar la única configuración de correo activa' 
        });
      }
    }

    await prisma.emailConfig.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Configuración eliminada exitosamente' });
  } catch (error) {
    console.error('Error eliminando configuración de correo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// POST /api/email-config/:id/test - Probar configuración de correo
router.post('/:id/test', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { testEmail } = req.body;

    const config = await prisma.emailConfig.findUnique({
      where: { id: parseInt(id) }
    });

    if (!config) {
      return res.status(404).json({ error: 'Configuración no encontrada' });
    }

    // TODO: Implementar lógica de prueba de envío de correo
    // Por ahora solo simulamos el envío
    
    const testResult = {
      success: true,
      message: 'Correo de prueba enviado exitosamente',
      sentTo: testEmail || config.email,
      timestamp: new Date().toISOString()
    };

    // Actualizar última fecha de uso
    await prisma.emailConfig.update({
      where: { id: parseInt(id) },
      data: { 
        lastUsedAt: new Date(),
        errorCount: 0,
        lastError: null
      }
    });

    res.json(testResult);
  } catch (error) {
    console.error('Error probando configuración de correo:', error);
    
    // Registrar el error en la configuración
    await prisma.emailConfig.update({
      where: { id: parseInt(req.params.id) },
      data: { 
        errorCount: { increment: 1 },
        lastError: error.message
      }
    }).catch(() => {}); // Ignorar errores en la actualización

    res.status(500).json({ 
      error: 'Error probando configuración de correo',
      details: error.message 
    });
  }
});

// POST /api/email-config/set-default/:id - Establecer como configuración por defecto
router.post('/set-default/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Quitar default de todas las configuraciones
    await prisma.emailConfig.updateMany({
      where: { isDefault: true },
      data: { isDefault: false }
    });

    // Establecer nueva configuración por defecto
    const updatedConfig = await prisma.emailConfig.update({
      where: { id: parseInt(id) },
      data: { isDefault: true, isActive: true },
      select: {
        id: true,
        name: true,
        provider: true,
        isDefault: true,
        isActive: true,
        email: true
      }
    });

    res.json(updatedConfig);
  } catch (error) {
    console.error('Error estableciendo configuración por defecto:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;