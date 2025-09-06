// scripts/seed-subscription-data.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de datos de suscripción...');

  // Crear módulos del sistema
  const modules = [
    // Módulos Core (incluidos en todos los planes)
    {
      name: 'core_dashboard',
      displayName: 'Dashboard Principal',
      description: 'Panel de control principal con métricas básicas',
      category: 'core',
      basePrice: 0,
      isCore: true,
      features: ['dashboard_basico', 'metricas_generales']
    },
    {
      name: 'core_auth',
      displayName: 'Autenticación y Usuarios',
      description: 'Sistema de login y gestión básica de usuarios',
      category: 'core',
      basePrice: 0,
      isCore: true,
      features: ['login', 'registro', 'perfil_usuario']
    },

    // Módulos de Facturación
    {
      name: 'facturacion_basica',
      displayName: 'Facturación Básica',
      description: 'Crear y gestionar facturas de venta básicas',
      category: 'facturacion',
      basePrice: 0,
      isCore: false,
      features: ['crear_facturas', 'gestionar_facturas', 'ncf_basico']
    },
    {
      name: 'facturacion_avanzada',
      displayName: 'Facturación Avanzada',
      description: 'Facturación con características avanzadas y automatización',
      category: 'facturacion',
      basePrice: 15,
      isCore: false,
      features: ['facturacion_recurrente', 'plantillas_avanzadas', 'automatizacion']
    },
    {
      name: 'cotizaciones',
      displayName: 'Cotizaciones',
      description: 'Sistema de cotizaciones y presupuestos',
      category: 'facturacion',
      basePrice: 10,
      isCore: false,
      features: ['crear_cotizaciones', 'convertir_a_factura', 'seguimiento']
    },
    {
      name: 'notas_credito',
      displayName: 'Notas de Crédito/Débito',
      description: 'Gestión de notas de crédito y débito',
      category: 'facturacion',
      basePrice: 8,
      isCore: false,
      features: ['notas_credito', 'notas_debito', 'anulaciones']
    },

    // Módulos de Gastos e Inventario
    {
      name: 'gastos_basicos',
      displayName: 'Registro de Gastos',
      description: 'Registro y categorización básica de gastos',
      category: 'gastos',
      basePrice: 5,
      isCore: false,
      features: ['registro_gastos', 'categorizacion', 'reportes_basicos']
    },
    {
      name: 'escaneo_gastos_ia',
      displayName: 'Escaneo de Gastos con IA',
      description: 'Escaneo automático de recibos usando inteligencia artificial',
      category: 'gastos',
      basePrice: 20,
      isCore: false,
      features: ['escaneo_ocr', 'extraccion_datos', 'validacion_automatica']
    },
    {
      name: 'inventario',
      displayName: 'Gestión de Inventario',
      description: 'Control completo de inventario y stock',
      category: 'inventario',
      basePrice: 25,
      isCore: false,
      features: ['control_stock', 'alertas_minimos', 'valoracion_inventario']
    },

    // Módulos de Reportes DGII
    {
      name: 'reportes_dgii_basicos',
      displayName: 'Reportes DGII (606, 607, 608)',
      description: 'Reportes básicos para la DGII',
      category: 'dgii',
      basePrice: 0,
      isCore: false,
      features: ['reporte_606', 'reporte_607', 'reporte_608']
    },
    {
      name: 'anexo_a_it1',
      displayName: 'Anexo A / IT-1',
      description: 'Reportes avanzados Anexo A e IT-1',
      category: 'dgii',
      basePrice: 30,
      isCore: false,
      features: ['anexo_a', 'it1_preliminar', 'validaciones_avanzadas']
    },

    // Módulos de Contabilidad
    {
      name: 'libro_diario',
      displayName: 'Libro Diario Automático',
      description: 'Generación automática de asientos contables',
      category: 'contabilidad',
      basePrice: 35,
      isCore: false,
      features: ['asientos_automaticos', 'libro_diario', 'integracion_facturas']
    },
    {
      name: 'reportes_financieros',
      displayName: 'Reportes Financieros',
      description: 'Balance general, estado de resultados y más',
      category: 'contabilidad',
      basePrice: 25,
      isCore: false,
      features: ['balance_general', 'estado_resultados', 'flujo_caja']
    },
    {
      name: 'conciliacion_bancaria',
      displayName: 'Conciliación Bancaria',
      description: 'Conciliación automática con extractos bancarios',
      category: 'contabilidad',
      basePrice: 30,
      isCore: false,
      features: ['conciliacion_automatica', 'importar_extractos', 'matching_inteligente']
    },

    // Módulos de Nómina
    {
      name: 'gestion_empleados',
      displayName: 'Gestión de Empleados',
      description: 'Base de datos de empleados y información laboral',
      category: 'nomina',
      basePrice: 20,
      isCore: false,
      features: ['ficha_empleados', 'historial_laboral', 'documentos']
    },
    {
      name: 'procesamiento_nomina',
      displayName: 'Procesamiento de Nómina',
      description: 'Cálculo y procesamiento completo de nómina',
      category: 'nomina',
      basePrice: 50,
      isCore: false,
      features: ['calculo_nomina', 'deducciones_tss', 'reportes_nomina', 'integration_bancaria']
    },

    // Módulos de Colaboración
    {
      name: 'usuarios_roles',
      displayName: 'Gestión de Usuarios y Roles',
      description: 'Sistema avanzado de usuarios y permisos',
      category: 'colaboracion',
      basePrice: 15,
      isCore: false,
      features: ['multiples_usuarios', 'roles_permisos', 'auditoria_accesos']
    },
    {
      name: 'portal_clientes',
      displayName: 'Portal de Clientes',
      description: 'Portal web para que los clientes vean sus facturas',
      category: 'colaboracion',
      basePrice: 25,
      isCore: false,
      features: ['acceso_clientes', 'historial_facturas', 'descargas']
    }
  ];

  // Crear módulos
  for (const moduleData of modules) {
    const existingModule = await prisma.module.findUnique({
      where: { name: moduleData.name }
    });

    if (!existingModule) {
      await prisma.module.create({
        data: moduleData
      });
      console.log(`✅ Módulo creado: ${moduleData.displayName}`);
    } else {
      console.log(`ℹ️  Módulo ya existe: ${moduleData.displayName}`);
    }
  }

  // Crear planes de suscripción
  const plans = [
    {
      name: 'Plan Básico',
      planType: 'BASICO',
      price: 25,
      billingCycle: 'monthly',
      trialDays: 30,
      description: 'Ideal para freelancers y emprendedores que inician.',
      features: {
        empresas: 1,
        usuarios: 1,
        facturas_mensuales: 50,
        clientes: 100,
        soporte: 'email'
      }
    },
    {
      name: 'Plan Pro',
      planType: 'PRO',
      price: 45,
      billingCycle: 'monthly',
      trialDays: 30,
      description: 'Para Pymes en crecimiento que necesitan automatización.',
      features: {
        empresas: 3,
        usuarios: 5,
        facturas_mensuales: 200,
        clientes: 500,
        soporte: 'chat_email'
      }
    },
    {
      name: 'Plan Premium',
      planType: 'PREMIUM',
      price: 75,
      billingCycle: 'monthly',
      trialDays: 30,
      description: 'La solución completa con nómina y colaboración avanzada.',
      features: {
        empresas: 10,
        usuarios: 15,
        facturas_mensuales: 1000,
        clientes: 2000,
        empleados: 50,
        soporte: 'telefono_chat_email'
      }
    }
  ];

  // Crear planes
  for (const planData of plans) {
    const existingPlan = await prisma.subscriptionPlan.findUnique({
      where: { name: planData.name }
    });

    if (!existingPlan) {
      const plan = await prisma.subscriptionPlan.create({
        data: planData
      });
      console.log(`✅ Plan creado: ${planData.name}`);

      // Asignar módulos a los planes
      const moduleAssignments = getModuleAssignments(planData.planType);
      
      for (const assignment of moduleAssignments) {
        const module = await prisma.module.findUnique({
          where: { name: assignment.moduleName }
        });

        if (module) {
          await prisma.planModule.create({
            data: {
              planId: plan.id,
              moduleId: module.id,
              included: assignment.included,
              extraPrice: assignment.extraPrice,
              maxUsage: assignment.maxUsage
            }
          });
        }
      }
      console.log(`✅ Módulos asignados al ${planData.name}`);
    } else {
      console.log(`ℹ️  Plan ya existe: ${planData.name}`);
    }
  }

  console.log('🎉 Seeding completado exitosamente!');
}

function getModuleAssignments(planType) {
  const assignments = {
    BASICO: [
      // Módulos core siempre incluidos
      { moduleName: 'core_dashboard', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'core_auth', included: true, extraPrice: null, maxUsage: null },
      
      // Módulos básicos incluidos
      { moduleName: 'facturacion_basica', included: true, extraPrice: null, maxUsage: 50 },
      { moduleName: 'cotizaciones', included: true, extraPrice: null, maxUsage: 20 },
      { moduleName: 'notas_credito', included: true, extraPrice: null, maxUsage: 10 },
      { moduleName: 'gastos_basicos', included: true, extraPrice: null, maxUsage: 100 },
      { moduleName: 'reportes_dgii_basicos', included: true, extraPrice: null, maxUsage: null },
      
      // Módulos adicionales (con costo extra)
      { moduleName: 'facturacion_avanzada', included: false, extraPrice: 15, maxUsage: null },
      { moduleName: 'escaneo_gastos_ia', included: false, extraPrice: 20, maxUsage: 50 },
      { moduleName: 'inventario', included: false, extraPrice: 25, maxUsage: 500 }
    ],
    
    PRO: [
      // Módulos core
      { moduleName: 'core_dashboard', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'core_auth', included: true, extraPrice: null, maxUsage: null },
      
      // Todos los básicos + algunos avanzados incluidos
      { moduleName: 'facturacion_basica', included: true, extraPrice: null, maxUsage: 200 },
      { moduleName: 'facturacion_avanzada', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'cotizaciones', included: true, extraPrice: null, maxUsage: 100 },
      { moduleName: 'notas_credito', included: true, extraPrice: null, maxUsage: 50 },
      { moduleName: 'gastos_basicos', included: true, extraPrice: null, maxUsage: 500 },
      { moduleName: 'escaneo_gastos_ia', included: true, extraPrice: null, maxUsage: 200 },
      { moduleName: 'inventario', included: true, extraPrice: null, maxUsage: 2000 },
      { moduleName: 'reportes_dgii_basicos', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'anexo_a_it1', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'libro_diario', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'reportes_financieros', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'conciliacion_bancaria', included: true, extraPrice: null, maxUsage: 100 },
      { moduleName: 'usuarios_roles', included: true, extraPrice: null, maxUsage: 5 },
      
      // Módulos premium con costo extra
      { moduleName: 'gestion_empleados', included: false, extraPrice: 20, maxUsage: 25 },
      { moduleName: 'procesamiento_nomina', included: false, extraPrice: 50, maxUsage: null },
      { moduleName: 'portal_clientes', included: false, extraPrice: 25, maxUsage: null }
    ],
    
    PREMIUM: [
      // Todos los módulos incluidos sin límites o con límites muy altos
      { moduleName: 'core_dashboard', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'core_auth', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'facturacion_basica', included: true, extraPrice: null, maxUsage: 1000 },
      { moduleName: 'facturacion_avanzada', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'cotizaciones', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'notas_credito', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'gastos_basicos', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'escaneo_gastos_ia', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'inventario', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'reportes_dgii_basicos', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'anexo_a_it1', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'libro_diario', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'reportes_financieros', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'conciliacion_bancaria', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'gestion_empleados', included: true, extraPrice: null, maxUsage: 50 },
      { moduleName: 'procesamiento_nomina', included: true, extraPrice: null, maxUsage: null },
      { moduleName: 'usuarios_roles', included: true, extraPrice: null, maxUsage: 15 },
      { moduleName: 'portal_clientes', included: true, extraPrice: null, maxUsage: null }
    ]
  };

  return assignments[planType] || [];
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });