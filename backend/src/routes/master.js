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
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sirim-secret-key');
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
        userId: user.id,
        email: user.email, 
        role: user.role,
        nombre: user.nombre
      }, 
      process.env.JWT_SECRET || 'sirim-secret-key', 
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

    res.json(empresas);

  } catch (error) {
    console.error('Error obteniendo empresas master:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Ver estadísticas del sistema (solo master)
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

module.exports = router;