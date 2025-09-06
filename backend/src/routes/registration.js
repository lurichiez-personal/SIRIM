const { Router } = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../db");
const { requireFields } = require("../utils/validators");
const emailService = require("../services/emailService");

const router = Router();

// Ruta de test
router.get("/test", (req, res) => {
  res.json({ message: "Registration routes working!" });
});

// Registro completo de empresa + usuario con notificaciones
router.post("/register-company", async (req, res, next) => {
  try {
    console.log('=== INICIO REGISTRO ===');
    console.log('Body recibido:', req.body);
    
    requireFields(req.body, ["nombreEmpresa", "rnc", "nombreUsuario", "email", "password"]);
    console.log('✅ requireFields pasó');
    
    const { nombreEmpresa, rnc, nombreUsuario, email, password } = req.body;
    console.log('Variables extraídas:', { nombreEmpresa, rnc, nombreUsuario, email });

    // Verificar si el email ya existe
    console.log('Verificando email existente...');
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    console.log('Resultado email existente:', existingUser);
    
    if (existingUser) {
      return res.status(409).json({ error: "El correo electrónico ya está registrado" });
    }

    // Verificar si el RNC ya existe
    const existingEmpresa = await prisma.empresa.findUnique({ 
      where: { rnc } 
    });
    
    if (existingEmpresa) {
      return res.status(409).json({ error: "El RNC ya está registrado" });
    }

    // Usar transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre: nombreEmpresa,
          rnc
        }
      });

      // 2. Crear usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          nombre: nombreUsuario,
          role: 'client',
          active: true,
          emailVerified: false
        }
      });

      // 3. Crear relación usuario-empresa
      await tx.userEmpresa.create({
        data: {
          userId: user.id,
          empresaId: empresa.id,
          role: 'admin',
          active: true
        }
      });

      // 4. Crear suscripción de prueba
      const defaultPlan = await tx.subscriptionPlan.findFirst({
        where: { planType: 'BASICO' }
      });

      if (defaultPlan) {
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 30); // 30 días de prueba

        await tx.suscripcion.create({
          data: {
            empresaId: empresa.id,
            planId: defaultPlan.id,
            status: 'trial',
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndDate,
            trialEnd: trialEndDate
          }
        });
      }

      return { empresa, user };
    });

    // 5. Enviar notificación por email al master user (fuera de la transacción)
    try {
      await emailService.sendNewClientNotification(result.empresa, result.user);
      console.log(`Notificación de nuevo cliente enviada: ${result.empresa.nombre}`);
    } catch (emailError) {
      console.error('Error enviando notificación por email:', emailError);
      // No fallar el registro por error de email
    }

    // Respuesta exitosa
    res.status(201).json({
      message: "Empresa y usuario registrados exitosamente",
      empresa: {
        id: result.empresa.id,
        nombre: result.empresa.nombre,
        rnc: result.empresa.rnc
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        role: result.user.role
      }
    });

  } catch (error) {
    console.error('Error en registro de empresa:', error);
    next(error);
  }
});

// Registro completo de empresa + usuario con pago directo
router.post("/register-company-with-payment", async (req, res, next) => {
  try {
    console.log('=== INICIO REGISTRO CON PAGO ===');
    console.log('Body recibido:', req.body);
    
    requireFields(req.body, ["nombreEmpresa", "rnc", "nombreUsuario", "email", "password", "plan", "paymentIntentId"]);
    
    const { nombreEmpresa, rnc, nombreUsuario, email, password, plan, paymentIntentId } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (existingUser) {
      return res.status(409).json({ error: "El correo electrónico ya está registrado" });
    }

    // Verificar si el RNC ya existe
    const existingEmpresa = await prisma.empresa.findUnique({ 
      where: { rnc } 
    });
    
    if (existingEmpresa) {
      return res.status(409).json({ error: "El RNC ya está registrado" });
    }

    // Usar transacción para asegurar atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear empresa
      const empresa = await tx.empresa.create({
        data: {
          nombre: nombreEmpresa,
          rnc
        }
      });

      // 2. Crear usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          nombre: nombreUsuario,
          role: 'client',
          active: true,
          emailVerified: false
        }
      });

      // 3. Crear relación usuario-empresa
      await tx.userEmpresa.create({
        data: {
          userId: user.id,
          empresaId: empresa.id,
          role: 'admin',
          active: true
        }
      });

      // 4. Crear suscripción activa (no es prueba)
      const selectedPlan = await tx.subscriptionPlan.findFirst({
        where: { planType: plan.toUpperCase() }
      });

      if (selectedPlan) {
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1); // 1 mes

        await tx.suscripcion.create({
          data: {
            empresaId: empresa.id,
            planId: selectedPlan.id,
            status: 'active',
            currentPeriodStart: new Date(),
            currentPeriodEnd: nextBillingDate,
            stripePaymentIntentId: paymentIntentId
          }
        });
      }

      return { empresa, user };
    });

    // 5. Enviar notificación por email al master user (fuera de la transacción)
    try {
      await emailService.sendNewClientNotification(result.empresa, result.user);
      console.log(`Notificación de nuevo cliente enviada: ${result.empresa.nombre} (PAGO)`);
    } catch (emailError) {
      console.error('Error enviando notificación por email:', emailError);
      // No fallar el registro por error de email
    }

    // Respuesta exitosa
    res.status(201).json({
      message: "Empresa y usuario registrados exitosamente con pago",
      empresa: {
        id: result.empresa.id,
        nombre: result.empresa.nombre,
        rnc: result.empresa.rnc
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        role: result.user.role
      }
    });

  } catch (error) {
    console.error('Error en registro de empresa con pago:', error);
    next(error);
  }
});

// Registro de usuario adicional para empresa existente
router.post("/register-user", async (req, res, next) => {
  try {
    requireFields(req.body, ["empresaId", "nombre", "email", "password", "role"]);
    
    const { empresaId, nombre, email, password, role = 'employee' } = req.body;

    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (existingUser) {
      return res.status(409).json({ error: "El correo electrónico ya está registrado" });
    }

    // Verificar que la empresa existe
    const empresa = await prisma.empresa.findUnique({
      where: { id: parseInt(empresaId) }
    });

    if (!empresa) {
      return res.status(404).json({ error: "Empresa no encontrada" });
    }

    // Crear usuario y relación
    const result = await prisma.$transaction(async (tx) => {
      // Crear usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          nombre,
          role: 'client',
          active: true,
          emailVerified: false
        }
      });

      // Crear relación usuario-empresa
      await tx.userEmpresa.create({
        data: {
          userId: user.id,
          empresaId: parseInt(empresaId),
          role,
          active: true
        }
      });

      return { user, empresa };
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente",
      user: {
        id: result.user.id,
        email: result.user.email,
        nombre: result.user.nombre,
        role: result.user.role
      },
      empresa: {
        id: result.empresa.id,
        nombre: result.empresa.nombre
      }
    });

  } catch (error) {
    console.error('Error en registro de usuario:', error);
    next(error);
  }
});

module.exports = router;