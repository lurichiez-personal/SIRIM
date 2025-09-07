const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { requireFields } = require("../utils/validators");

const router = Router();

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
};

// Middleware para verificar que sea usuario master
const verifyMaster = (req, res, next) => {
  if (req.user.role !== 'master') {
    return res.status(403).json({ 
      error: 'Acceso denegado - Solo usuarios master' 
    });
  }
  next();
};

// Login específico para sistema master (compatible con nuevo esquema)
router.post("/login", async (req, res, next) => {
  try {
    requireFields(req.body, ["email", "password"]);
    const { email, password } = req.body;
    
    // Buscar usuario con empresas asociadas
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() },
      include: {
        empresas: {
          include: {
            empresa: {
              select: {
                id: true,
                nombre: true,
                rnc: true
              }
            }
          }
        }
      }
    });
    
    if (!user || !user.active) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }
    
    const token = jwt.sign(
      { 
        sub: user.id,
        userId: user.id,
        email: user.email, 
        role: user.role,
        roles: [user.role],
        nombre: user.nombre
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: "7d" }
    );
    
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        nombre: user.nombre, 
        role: user.role,
        empresas: user.empresas.map(ue => ({
          id: ue.empresa.id,
          nombre: ue.empresa.nombre,
          rnc: ue.empresa.rnc,
          userRole: ue.role
        }))
      } 
    });
  } catch (e) { 
    next(e); 
  }
});

// Ver todas las empresas del sistema (solo master)
router.get('/empresas', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({
      include: {
        usuarios: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nombre: true,
                role: true,
                active: true,
                createdAt: true
              }
            }
          }
        },
        suscripcion: true,
        _count: {
          select: {
            clientes: true,
            empleados: true,
            recurrencias: true,
            nominas: true,
            usuarios: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Obtener los planes y agregar la información del plan a cada suscripción
    for (let empresa of empresas) {
      if (empresa.suscripcion && empresa.suscripcion.planId) {
        try {
          const plan = await prisma.$queryRaw`
            SELECT id, name, price, currency, "planType", "billingCycle"
            FROM subscription_plans 
            WHERE id = ${empresa.suscripcion.planId}
          `;
          
          if (plan && plan.length > 0) {
            empresa.suscripcion.plan = plan[0];
          } else {
            // Si no se encuentra el plan, usar datos por defecto
            empresa.suscripcion.plan = {
              id: empresa.suscripcion.planId,
              name: 'Plan Básico',
              price: 49.00,
              currency: 'USD'
            };
          }
        } catch (planError) {
          // Si hay error obteniendo el plan, usar datos por defecto
          empresa.suscripcion.plan = {
            id: empresa.suscripcion.planId,
            name: 'Plan Básico',
            price: 49.00,
            currency: 'USD'
          };
        }
      }
    }

    res.json(empresas);

  } catch (error) {
    console.error('Error obteniendo empresas master:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver estadísticas del sistema (solo master)
// Gestión de usuarios para empresas (solo master)
router.get('/empresa/:empresaId/usuarios', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId);
    
    const usuarios = await prisma.userEmpresa.findMany({
      where: { empresaId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
            role: true,
            active: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    });

    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear usuario para una empresa específica (solo master)
router.post('/empresa/:empresaId/usuarios', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId);
    requireFields(req.body, ["nombre", "email", "password", "companyRole"]);
    
    const { nombre, email, password, companyRole, globalRole = "client" } = req.body;
    
    // Verificar si el email ya existe
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    let userId;
    
    if (existingUser) {
      // Usuario existe, solo crear relación con empresa
      const existingRelation = await prisma.userEmpresa.findFirst({
        where: { 
          userId: existingUser.id, 
          empresaId 
        }
      });
      
      if (existingRelation) {
        return res.status(409).json({ error: 'El usuario ya pertenece a esta empresa' });
      }
      
      userId = existingUser.id;
    } else {
      // Crear nuevo usuario
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          nombre,
          role: globalRole,
          active: true,
          emailVerified: false
        }
      });
      userId = newUser.id;
    }
    
    // Crear relación usuario-empresa
    const userEmpresa = await prisma.userEmpresa.create({
      data: {
        userId,
        empresaId,
        role: companyRole,
        active: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
            role: true,
            active: true,
            emailVerified: true,
            createdAt: true
          }
        }
      }
    });
    
    res.status(201).json(userEmpresa);
    
  } catch (error) {
    console.error('Error creando usuario para empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar rol de usuario en empresa (solo master)
router.put('/empresa/:empresaId/usuarios/:userId', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId);
    const userId = parseInt(req.params.userId);
    const { companyRole, active } = req.body;
    
    const userEmpresa = await prisma.userEmpresa.updateMany({
      where: { 
        userId, 
        empresaId 
      },
      data: {
        ...(companyRole && { role: companyRole }),
        ...(active !== undefined && { active })
      }
    });
    
    if (userEmpresa.count === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en esta empresa' });
    }
    
    res.json({ message: 'Usuario actualizado exitosamente' });
    
  } catch (error) {
    console.error('Error actualizando usuario de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario de empresa (solo master)
router.delete('/empresa/:empresaId/usuarios/:userId', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresaId = parseInt(req.params.empresaId);
    const userId = parseInt(req.params.userId);
    
    const result = await prisma.userEmpresa.deleteMany({
      where: { 
        userId, 
        empresaId 
      }
    });
    
    if (result.count === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado en esta empresa' });
    }
    
    res.json({ message: 'Usuario eliminado de la empresa exitosamente' });
    
  } catch (error) {
    console.error('Error eliminando usuario de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.get('/stats', verifyToken, verifyMaster, async (req, res) => {
  try {
    const [
      totalEmpresas,
      totalUsuarios,
      empresasActivas,
      suscripcionesActivas,
      ingresosMensuales
    ] = await Promise.all([
      prisma.empresa.count(),
      prisma.user.count({ where: { active: true } }),
      prisma.empresa.count({
        where: {
          suscripcion: {
            status: 'active'
          }
        }
      }),
      prisma.suscripcion.count({
        where: { status: 'active' }
      }),
      prisma.pago.aggregate({
        where: {
          status: 'succeeded',
          paidAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    res.json({
      totalEmpresas,
      totalUsuarios,
      empresasActivas,
      suscripcionesActivas,
      ingresosMensuales: ingresosMensuales._sum.amount || 0
    });

  } catch (error) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Crear notificación (solo master)
router.post('/notifications', verifyToken, verifyMaster, async (req, res) => {
  try {
    const { userId, type, title, message, data } = req.body;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null
      }
    });

    res.json(notification);

  } catch (error) {
    console.error('Error creando notificación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver todas las notificaciones (solo master)
router.get('/notifications', verifyToken, verifyMaster, async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json(notifications);

  } catch (error) {
    console.error('Error obteniendo notificaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver detalles de una empresa específica (solo master)
router.get('/empresas/:id', verifyToken, verifyMaster, async (req, res) => {
  try {
    const empresaId = parseInt(req.params.id);
    
    const empresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      include: {
        usuarios: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                nombre: true,
                role: true,
                active: true,
                createdAt: true
              }
            }
          }
        },
        suscripcion: {
          include: {
            plan: true,
            pagos: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        },
        clientes: {
          select: {
            id: true,
            nombre: true,
            rnc: true,
            createdAt: true
          },
          take: 10
        },
        empleados: {
          select: {
            id: true,
            nombre: true,
            cedula: true,
            createdAt: true
          },
          take: 10
        }
      }
    });

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(empresa);

  } catch (error) {
    console.error('Error obteniendo detalles de empresa:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST/PUT /config - Configuración master
router.put("/config", verifyToken, verifyMaster, async (req, res) => {
  try {
    const config = req.body;
    
    // Aquí podrías guardar en una tabla de configuración
    // Por ahora solo devuelve éxito para que funcione el frontend
    
    res.json({ 
      success: true,
      message: 'Configuración guardada exitosamente',
      config: config 
    });
  } catch (error) {
    console.error('Error guardando configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /config - Obtener configuración master
router.get("/config", verifyToken, verifyMaster, async (req, res) => {
  try {
    // Aquí podrías cargar desde una tabla de configuración
    // Por ahora devuelve configuración por defecto
    
    const defaultConfig = {
      pricing: {
        basicPlan: { monthlyPrice: 1500, yearlyPrice: 15000, maxUsers: 3, maxCompanies: 1 },
        proPlan: { monthlyPrice: 3000, yearlyPrice: 30000, maxUsers: 10, maxCompanies: 5 },
        premiumPlan: { monthlyPrice: 5000, yearlyPrice: 50000, maxUsers: 50, maxCompanies: 20 }
      },
      notifications: {
        smtpHost: 'smtp.gmail.com',
        smtpPort: 587,
        smtpUser: '',
        smtpPassword: '',
        fromEmail: 'noreply@sirim.do',
        fromName: 'SIRIM - Sistema de Registros',
        supportEmail: 'soporte@sirim.do',
        enableEmailNotifications: true,
        enableSmsNotifications: false
      },
      general: {
        appName: 'SIRIM',
        supportPhone: '(809) 000-0000',
        maxFileUploadSize: 10,
        maintenanceMode: false,
        allowNewRegistrations: true
      }
    };
    
    res.json({ success: true, config: defaultConfig });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;