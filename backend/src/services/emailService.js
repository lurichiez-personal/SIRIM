const sgMail = require('@sendgrid/mail');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class EmailService {
  constructor() {
    // Configurar SendGrid solo si está disponible
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      if (!process.env.SENDGRID_API_KEY) {
        console.log('SENDGRID_API_KEY no configurado - simulando envío de email:', {
          to, subject, text: text || 'HTML email'
        });
        return { success: true, simulated: true };
      }

      const config = await this.getPaymentConfig();
      const fromEmail = config?.supportEmail || 'soporte@sirim.do';

      const msg = {
        to,
        from: fromEmail,
        subject,
        html,
        text: text || this.htmlToText(html)
      };

      const result = await sgMail.send(msg);
      console.log('Email enviado exitosamente:', { to, subject });
      return { success: true, messageId: result[0]?.headers['x-message-id'] };

    } catch (error) {
      console.error('Error enviando email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendNewClientNotification(empresaData, userData) {
    try {
      const subject = `Nuevo Cliente Registrado - ${empresaData.nombre}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #2563eb; }
            .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Nuevo Cliente en SIRIM</h1>
            </div>
            
            <div class="content">
              <div class="card">
                <h2>Información de la Empresa</h2>
                <p><strong>Nombre:</strong> ${empresaData.nombre}</p>
                <p><strong>RNC:</strong> ${empresaData.rnc}</p>
                <p><strong>Fecha de Registro:</strong> ${new Date().toLocaleDateString('es-DO')}</p>
              </div>

              <div class="card">
                <h2>Usuario Principal</h2>
                <p><strong>Nombre:</strong> ${userData.nombre}</p>
                <p><strong>Email:</strong> ${userData.email}</p>
              </div>

              <div class="card">
                <h2>Próximos Pasos</h2>
                <p>El nuevo cliente ha sido registrado exitosamente en el sistema. Puedes:</p>
                <ul>
                  <li>Revisar su información en el panel master</li>
                  <li>Contactar directamente con el cliente</li>
                  <li>Configurar su suscripción si es necesario</li>
                </ul>
                
                <a href="${process.env.FRONTEND_URL}/#/dashboard/master" class="btn">
                  Ver Panel Master
                </a>
              </div>
            </div>

            <div class="footer">
              <p>Este email fue enviado automáticamente por SIRIM</p>
              <p>&copy; ${new Date().getFullYear()} SIRIM - Sistema Inteligente de Registros Impositivos</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Obtener email del master user
      const masterUser = await prisma.user.findFirst({
        where: { role: 'master' }
      });

      if (!masterUser) {
        console.warn('No se encontró usuario master para enviar notificación');
        return { success: false, error: 'Usuario master no encontrado' };
      }

      const result = await this.sendEmail(masterUser.email, subject, html);

      // Crear notificación en base de datos
      if (result.success) {
        await prisma.notification.create({
          data: {
            userId: masterUser.id,
            type: 'new_client',
            title: 'Nuevo Cliente Registrado',
            message: `${empresaData.nombre} (${empresaData.rnc}) se ha registrado en el sistema`,
            data: JSON.stringify({ empresaId: empresaData.id, userEmail: userData.email }),
            emailSent: true
          }
        });
      }

      return result;

    } catch (error) {
      console.error('Error enviando notificación de nuevo cliente:', error);
      return { success: false, error: error.message };
    }
  }

  async sendPaymentSuccessNotification(paymentData, empresaData) {
    try {
      const subject = `Pago Exitoso - ${empresaData.nombre}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #059669; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #059669; }
            .amount { font-size: 24px; font-weight: bold; color: #059669; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💰 Pago Recibido</h1>
            </div>
            
            <div class="content">
              <div class="card">
                <h2>Detalles del Pago</h2>
                <p class="amount">$${paymentData.amount} ${paymentData.currency}</p>
                <p><strong>Empresa:</strong> ${empresaData.nombre}</p>
                <p><strong>Método:</strong> ${paymentData.paymentMethod || 'Tarjeta'}</p>
                <p><strong>Fecha:</strong> ${new Date(paymentData.paidAt).toLocaleDateString('es-DO')}</p>
                <p><strong>ID de Transacción:</strong> ${paymentData.stripePaymentIntentId}</p>
              </div>
            </div>

            <div class="footer">
              <p>Este email fue enviado automáticamente por SIRIM</p>
              <p>&copy; ${new Date().getFullYear()} SIRIM - Sistema Inteligente de Registros Impositivos</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Obtener email del master user
      const masterUser = await prisma.user.findFirst({
        where: { role: 'master' }
      });

      if (!masterUser) {
        return { success: false, error: 'Usuario master no encontrado' };
      }

      const result = await this.sendEmail(masterUser.email, subject, html);

      // Crear notificación en base de datos
      if (result.success) {
        await prisma.notification.create({
          data: {
            userId: masterUser.id,
            type: 'payment_success',
            title: 'Pago Recibido',
            message: `Pago de $${paymentData.amount} ${paymentData.currency} de ${empresaData.nombre}`,
            data: JSON.stringify({ paymentId: paymentData.id, empresaId: empresaData.id }),
            emailSent: true
          }
        });
      }

      return result;

    } catch (error) {
      console.error('Error enviando notificación de pago:', error);
      return { success: false, error: error.message };
    }
  }

  async sendSubscriptionCanceledNotification(suscripcionData, empresaData) {
    try {
      const subject = `Suscripción Cancelada - ${empresaData.nombre}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
            .content { background: #f9fafb; padding: 20px; }
            .card { background: white; padding: 20px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #dc2626; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Suscripción Cancelada</h1>
            </div>
            
            <div class="content">
              <div class="card">
                <h2>Detalles de la Cancelación</h2>
                <p><strong>Empresa:</strong> ${empresaData.nombre}</p>
                <p><strong>RNC:</strong> ${empresaData.rnc}</p>
                <p><strong>Plan:</strong> ${suscripcionData.plan?.name || 'N/A'}</p>
                <p><strong>Fecha de Cancelación:</strong> ${new Date().toLocaleDateString('es-DO')}</p>
                <p><strong>Estado:</strong> ${suscripcionData.status}</p>
              </div>

              <div class="card">
                <h2>Acciones Recomendadas</h2>
                <ul>
                  <li>Contactar al cliente para entender la razón de la cancelación</li>
                  <li>Ofrecer soporte adicional si es necesario</li>
                  <li>Revisar los datos de facturación por posibles errores</li>
                </ul>
              </div>
            </div>

            <div class="footer">
              <p>Este email fue enviado automáticamente por SIRIM</p>
              <p>&copy; ${new Date().getFullYear()} SIRIM - Sistema Inteligente de Registros Impositivos</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Obtener email del master user
      const masterUser = await prisma.user.findFirst({
        where: { role: 'master' }
      });

      if (!masterUser) {
        return { success: false, error: 'Usuario master no encontrado' };
      }

      const result = await this.sendEmail(masterUser.email, subject, html);

      // Crear notificación en base de datos
      if (result.success) {
        await prisma.notification.create({
          data: {
            userId: masterUser.id,
            type: 'subscription_canceled',
            title: 'Suscripción Cancelada',
            message: `${empresaData.nombre} ha cancelado su suscripción`,
            data: JSON.stringify({ suscripcionId: suscripcionData.id, empresaId: empresaData.id }),
            emailSent: true
          }
        });
      }

      return result;

    } catch (error) {
      console.error('Error enviando notificación de cancelación:', error);
      return { success: false, error: error.message };
    }
  }

  // Obtener configuración de pagos
  async getPaymentConfig() {
    try {
      return await prisma.paymentConfig.findFirst({
        where: { active: true }
      });
    } catch (error) {
      console.error('Error obteniendo configuración de pagos:', error);
      return null;
    }
  }

  // Convertir HTML a texto plano simple
  htmlToText(html) {
    return html
      .replace(/<[^>]*>/g, '') // Remover tags HTML
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

module.exports = new EmailService();