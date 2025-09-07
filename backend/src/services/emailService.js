const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    // Configurar SendGrid por compatibilidad (fallback)
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    
    this.transporters = new Map();
  }

  // Obtener configuración de correo por defecto
  async getDefaultConfig() {
    const config = await prisma.emailConfig.findFirst({
      where: { isDefault: true, isActive: true }
    });

    return config;
  }

  // Crear transporter de Nodemailer basado en la configuración
  async createTransporter(config) {
    const transporterId = `${config.provider}_${config.id}`;
    
    if (this.transporters.has(transporterId)) {
      return this.transporters.get(transporterId);
    }

    let transporter;

    switch (config.provider) {
      case 'GMAIL':
        transporter = nodemailer.createTransporter({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: config.email,
            pass: config.password // Debe ser App Password de Gmail
          }
        });
        break;

      case 'OUTLOOK':
        transporter = nodemailer.createTransporter({
          service: 'hotmail',
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: config.email,
            pass: config.password
          }
        });
        break;

      case 'OFFICE365':
        transporter = nodemailer.createTransporter({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          auth: {
            user: config.email,
            pass: config.password
          }
        });
        break;

      case 'SENDGRID':
        // Para SendGrid, mantener compatibilidad con el método existente
        return null; // Indica que debe usar el método SendGrid original
        
      case 'CUSTOM_SMTP':
        transporter = nodemailer.createTransporter({
          host: config.smtpHost,
          port: config.smtpPort,
          secure: config.smtpSecure,
          auth: {
            user: config.email,
            pass: config.password
          }
        });
        break;

      default:
        throw new Error(`Proveedor de correo no soportado: ${config.provider}`);
    }

    // Cachear el transporter
    this.transporters.set(transporterId, transporter);
    return transporter;
  }

  // Enviar email usando SendGrid (método original)
  async sendEmailWithSendGrid(to, subject, html, text = null, fromEmail = null) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SENDGRID_API_KEY no configurado - simulando envío de email:', {
          to, subject, text: text || 'HTML email'
        });
        return { success: true, simulated: true };
      }

      const config = await this.getPaymentConfig();
      const from = fromEmail || config?.supportEmail || 'soporte@sirim.do';

      const msg = {
        to,
        from,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await sgMail.send(msg);
      console.log('Email enviado exitosamente via SendGrid:', { to, subject });
      
      return { 
        success: true, 
        messageId: result[0]?.headers['x-message-id'],
        provider: 'SENDGRID'
      };

    } catch (error) {
      console.error('Error enviando email via SendGrid:', error);
      return { success: false, error: error.message, provider: 'SENDGRID' };
    }
  }

  // Enviar email usando Nodemailer
  async sendEmailWithNodemailer(config, to, subject, html, text = null) {
    try {
      const transporter = await this.createTransporter(config);

      if (!transporter) {
        throw new Error('No se pudo crear el transporter para este proveedor');
      }

      const mailOptions = {
        from: `${config.fromName} <${config.email}>`,
        to,
        subject,
        html,
        text: text || this.htmlToText(html),
        replyTo: config.replyTo || config.email
      };

      const result = await transporter.sendMail(mailOptions);
      console.log(`Email enviado exitosamente via ${config.provider}:`, { to, subject });
      
      // Actualizar estadísticas de éxito
      await this.updateConfigStats(config.id, true);

      return { 
        success: true, 
        messageId: result.messageId,
        provider: config.provider
      };

    } catch (error) {
      console.error(`Error enviando email via ${config.provider}:`, error);
      
      // Actualizar estadísticas de error
      await this.updateConfigStats(config.id, false, error.message);
      
      return { 
        success: false, 
        error: error.message, 
        provider: config.provider 
      };
    }
  }

  // Método principal para enviar email
  async sendEmail(to, subject, html, text = null, configId = null) {
    try {
      let config;

      if (configId) {
        // Usar configuración específica
        config = await prisma.emailConfig.findUnique({
          where: { id: configId, isActive: true }
        });
      } else {
        // Usar configuración por defecto
        config = await this.getDefaultConfig();
      }

      // Si no hay configuración personalizada, usar SendGrid por defecto
      if (!config) {
        console.log('No hay configuración de correo personalizada, usando SendGrid por defecto');
        return await this.sendEmailWithSendGrid(to, subject, html, text);
      }

      // Si es SendGrid, usar el método original
      if (config.provider === 'SENDGRID') {
        return await this.sendEmailWithSendGrid(to, subject, html, text, config.email);
      }

      // Para otros proveedores, usar Nodemailer
      return await this.sendEmailWithNodemailer(config, to, subject, html, text);

    } catch (error) {
      console.error('Error general enviando email:', error);
      return { success: false, error: error.message };
    }
  }

  // Actualizar estadísticas de uso de configuración
  async updateConfigStats(configId, success, errorMessage = null) {
    try {
      if (success) {
        await prisma.emailConfig.update({
          where: { id: configId },
          data: {
            lastUsedAt: new Date(),
            errorCount: 0,
            lastError: null
          }
        });
      } else {
        await prisma.emailConfig.update({
          where: { id: configId },
          data: {
            errorCount: { increment: 1 },
            lastError: errorMessage
          }
        });
      }
    } catch (error) {
      console.error('Error actualizando estadísticas de configuración:', error);
    }
  }

  // Convertir HTML a texto plano
  htmlToText(html) {
    return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }

  // Obtener configuración de pagos (mantener compatibilidad)
  async getPaymentConfig() {
    try {
      const config = await prisma.paymentConfig.findFirst({
        where: { active: true },
        select: { supportEmail: true }
      });
      return config;
    } catch (error) {
      console.error('Error obteniendo configuración de pagos:', error);
      return null;
    }
  }

  // Enviar email de notificación específico para el sistema
  async sendSystemNotification(type, data) {
    try {
      const masterEmail = 'lurichiez@gmail.com';
      let subject, html;

      switch (type) {
        case 'new_client_registration':
          subject = `[SIRIM] Nuevo cliente registrado: ${data.clientName}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Nuevo Cliente Registrado</h2>
              <p>Se ha registrado un nuevo cliente en SIRIM:</p>
              <ul>
                <li><strong>Empresa:</strong> ${data.clientName}</li>
                <li><strong>Email:</strong> ${data.email}</li>
                <li><strong>RNC:</strong> ${data.rnc}</li>
                <li><strong>Plan:</strong> ${data.plan}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</li>
              </ul>
              <p>Puedes revisar los detalles en el panel de administración de SIRIM.</p>
            </div>
          `;
          break;

        case 'payment_success':
          subject = `[SIRIM] Pago exitoso: ${data.clientName}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;">Pago Procesado Exitosamente</h2>
              <p>Se ha procesado un pago en SIRIM:</p>
              <ul>
                <li><strong>Cliente:</strong> ${data.clientName}</li>
                <li><strong>Monto:</strong> $${data.amount} ${data.currency}</li>
                <li><strong>Plan:</strong> ${data.plan}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</li>
              </ul>
            </div>
          `;
          break;

        case 'payment_failed':
          subject = `[SIRIM] Fallo en el pago: ${data.clientName}`;
          html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Fallo en el Pago</h2>
              <p>Ha ocurrido un error en el procesamiento de pago:</p>
              <ul>
                <li><strong>Cliente:</strong> ${data.clientName}</li>
                <li><strong>Monto:</strong> $${data.amount} ${data.currency}</li>
                <li><strong>Plan:</strong> ${data.plan}</li>
                <li><strong>Error:</strong> ${data.error}</li>
                <li><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-DO')}</li>
              </ul>
              <p>Es recomendable contactar al cliente para resolver este inconveniente.</p>
            </div>
          `;
          break;

        default:
          throw new Error(`Tipo de notificación no soportado: ${type}`);
      }

      return await this.sendEmail(masterEmail, subject, html);

    } catch (error) {
      console.error('Error enviando notificación del sistema:', error);
      return { success: false, error: error.message };
    }
  }

  // Probar configuración de correo
  async testEmailConfig(configId, testEmail = null) {
    try {
      const config = await prisma.emailConfig.findUnique({
        where: { id: configId }
      });

      if (!config) {
        throw new Error('Configuración de correo no encontrada');
      }

      const recipient = testEmail || config.email;
      const subject = 'Prueba de Configuración de Correo - SIRIM';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Prueba de Correo Exitosa</h2>
          <p>Esta es una prueba de la configuración de correo de SIRIM.</p>
          <p><strong>Proveedor:</strong> ${config.provider}</p>
          <p><strong>Email configurado:</strong> ${config.email}</p>
          <p><strong>Fecha de prueba:</strong> ${new Date().toLocaleDateString('es-DO')}</p>
          <p>Si recibiste este correo, la configuración está funcionando correctamente.</p>
        </div>
      `;

      return await this.sendEmail(recipient, subject, html, null, configId);

    } catch (error) {
      console.error('Error probando configuración de correo:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new EmailService();