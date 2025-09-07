// Rutas para carga masiva de datos via Excel
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Configurar multer para archivos Excel
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    console.log('Archivo recibido:', file.originalname, 'MIME:', file.mimetype);
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        file.mimetype === 'application/vnd.ms-excel' ||
        file.mimetype === 'application/octet-stream' || // Para archivos Excel sin MIME detectado
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      console.log('Archivo rechazado - MIME no válido:', file.mimetype);
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB límite
  }
});

// Función auxiliar para convertir fecha Excel a Date
function excelDateToJSDate(excelDate) {
  if (typeof excelDate === 'string' && !isNaN(Date.parse(excelDate))) {
    return new Date(excelDate);
  }
  
  if (typeof excelDate === 'number') {
    return new Date((excelDate - 25569) * 86400 * 1000);
  }
  
  return new Date();
}

// Función auxiliar para limpiar números
function parseNumber(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,$]/g, '');
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

// POST /api/bulk/gastos - Carga masiva de gastos
router.post('/gastos', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const { empresaId } = req.body;
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    // Leer archivo Excel
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const gastos = [];
    const errores = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        // Mapear los campos del Excel a la estructura de la BD
        const gasto = {
          empresaId: parseInt(empresaId),
          proveedorNombre: row.Proveedor || row.proveedor || '',
          rncProveedor: row.RNC || row.rnc || null,
          categoriaGasto: row.Categoria || row.categoria || null,
          fecha: excelDateToJSDate(row.Fecha || row.fecha),
          subtotal: parseNumber(row.Subtotal || row.subtotal || 0),
          itbis: parseNumber(row.ITBIS || row.itbis || 0),
          isc: parseNumber(row.ISC || row.isc) || null,
          propinaLegal: parseNumber(row['Propina Legal'] || row.propinaLegal) || null,
          monto: parseNumber(row.Monto || row.monto || row.Total || row.total || 0),
          ncf: row.NCF || row.ncf || null,
          descripcion: row.Descripcion || row.descripcion || row.Concepto || row.concepto || 'Carga masiva',
          conciliado: true, // Marcado como facturado y pagado según solicitud
          aplicaITBIS: (row.ITBIS || row.itbis || 0) > 0,
          metodoPago: row['Metodo Pago'] || row.metodoPago || 'Efectivo'
        };

        // Calcular monto total si no viene
        if (gasto.monto === 0) {
          gasto.monto = gasto.subtotal + gasto.itbis + (gasto.isc || 0) + (gasto.propinaLegal || 0);
        }

        gastos.push(gasto);
      } catch (error) {
        errores.push({ fila: i + 1, error: error.message });
      }
    }

    // Insertar en la base de datos
    const resultados = await prisma.gasto.createMany({
      data: gastos,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: `Se procesaron ${resultados.count} gastos exitosamente`,
      procesados: resultados.count,
      errores: errores.length,
      detalleErrores: errores
    });

  } catch (error) {
    console.error('Error en carga masiva de gastos:', error);
    res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
});

// POST /api/bulk/ingresos - Carga masiva de ingresos
router.post('/ingresos', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const { empresaId } = req.body;
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const ingresos = [];
    const errores = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const ingreso = {
          empresaId: parseInt(empresaId),
          clienteNombre: row.Cliente || row.cliente || '',
          rncCliente: row.RNC || row.rnc || null,
          categoriaIngreso: row.Categoria || row.categoria || null,
          fecha: excelDateToJSDate(row.Fecha || row.fecha),
          subtotal: parseNumber(row.Subtotal || row.subtotal || 0),
          itbis: parseNumber(row.ITBIS || row.itbis || 0),
          isc: parseNumber(row.ISC || row.isc) || null,
          propinaLegal: parseNumber(row['Propina Legal'] || row.propinaLegal) || null,
          monto: parseNumber(row.Monto || row.monto || row.Total || row.total || 0),
          ncf: row.NCF || row.ncf || null,
          descripcion: row.Descripcion || row.descripcion || row.Concepto || row.concepto || 'Carga masiva',
          conciliado: true, // Marcado como facturado y pagado
          aplicaITBIS: (row.ITBIS || row.itbis || 0) > 0,
          metodoCobro: row['Metodo Cobro'] || row.metodoCobro || 'Efectivo'
        };

        if (ingreso.monto === 0) {
          ingreso.monto = ingreso.subtotal + ingreso.itbis + (ingreso.isc || 0) + (ingreso.propinaLegal || 0);
        }

        ingresos.push(ingreso);
      } catch (error) {
        errores.push({ fila: i + 1, error: error.message });
      }
    }

    const resultados = await prisma.ingreso.createMany({
      data: ingresos,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: `Se procesaron ${resultados.count} ingresos exitosamente`,
      procesados: resultados.count,
      errores: errores.length,
      detalleErrores: errores
    });

  } catch (error) {
    console.error('Error en carga masiva de ingresos:', error);
    res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
});

// POST /api/bulk/empleados - Carga masiva de empleados
router.post('/empleados', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const { empresaId } = req.body;
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const empleados = [];
    const errores = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const empleado = {
          empresaId: parseInt(empresaId),
          nombre: row.Nombre || row.nombre || '',
          cedula: row.Cedula || row.cedula || row.Identificacion || row.identificacion || '',
          puesto: row.Puesto || row.puesto || row.Cargo || row.cargo || 'Empleado',
          salarioBrutoMensual: parseNumber(row.Salario || row.salario || row['Salario Mensual'] || row.salarioMensual || 0),
          fechaIngreso: excelDateToJSDate(row['Fecha Ingreso'] || row.fechaIngreso || row.Fecha || row.fecha),
          activo: true
        };

        if (!empleado.nombre || !empleado.cedula) {
          throw new Error('Nombre y cédula son obligatorios');
        }

        empleados.push(empleado);
      } catch (error) {
        errores.push({ fila: i + 1, error: error.message });
      }
    }

    const resultados = await prisma.empleado.createMany({
      data: empleados,
      skipDuplicates: true
    });

    res.json({
      success: true,
      message: `Se procesaron ${resultados.count} empleados exitosamente`,
      procesados: resultados.count,
      errores: errores.length,
      detalleErrores: errores
    });

  } catch (error) {
    console.error('Error en carga masiva de empleados:', error);
    res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
});

// POST /api/bulk/pagos-empleados - Carga masiva de pagos a empleados (nómina)
router.post('/pagos-empleados', authRequired, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió archivo' });
    }

    const { empresaId, periodo } = req.body;
    if (!empresaId || !periodo) {
      return res.status(400).json({ error: 'empresaId y periodo son requeridos' });
    }

    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (data.length === 0) {
      return res.status(400).json({ error: 'El archivo está vacío' });
    }

    const pagosEmpleados = [];
    const errores = [];
    let totalPagado = 0;
    let totalCostoEmp = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const pagoEmpleado = {
          empleadoId: null, // Se buscará por cédula
          cedula: row.Cedula || row.cedula || row.Identificacion || row.identificacion || '',
          nombre: row.Nombre || row.nombre || '',
          salarioBruto: parseNumber(row['Salario Bruto'] || row.salarioBruto || row.Salario || row.salario || 0),
          descuentos: {
            afp: parseNumber(row.AFP || row.afp || 0),
            sfs: parseNumber(row.SFS || row.sfs || 0),
            isr: parseNumber(row.ISR || row.isr || 0),
            otros: parseNumber(row['Otros Descuentos'] || row.otrosDescuentos || 0)
          },
          bonificaciones: parseNumber(row.Bonificaciones || row.bonificaciones || 0),
          horasExtras: parseNumber(row['Horas Extras'] || row.horasExtras || 0),
          salarioNeto: parseNumber(row['Salario Neto'] || row.salarioNeto || 0),
          costosEmpresa: {
            tss: parseNumber(row.TSS || row.tss || 0),
            rl: parseNumber(row.RL || row.rl || 0),
            infotep: parseNumber(row.INFOTEP || row.infotep || 0)
          }
        };

        // Buscar empleado por cédula
        const empleado = await prisma.empleado.findFirst({
          where: { 
            empresaId: parseInt(empresaId), 
            cedula: pagoEmpleado.cedula,
            activo: true 
          }
        });

        if (!empleado) {
          throw new Error(`Empleado con cédula ${pagoEmpleado.cedula} no encontrado`);
        }

        pagoEmpleado.empleadoId = empleado.id;
        
        // Calcular salario neto si no viene
        if (pagoEmpleado.salarioNeto === 0) {
          const totalDescuentos = pagoEmpleado.descuentos.afp + pagoEmpleado.descuentos.sfs + 
                                 pagoEmpleado.descuentos.isr + pagoEmpleado.descuentos.otros;
          pagoEmpleado.salarioNeto = pagoEmpleado.salarioBruto + pagoEmpleado.bonificaciones + 
                                    pagoEmpleado.horasExtras - totalDescuentos;
        }

        const costoTotal = pagoEmpleado.salarioBruto + pagoEmpleado.bonificaciones + 
                          pagoEmpleado.horasExtras + pagoEmpleado.costosEmpresa.tss + 
                          pagoEmpleado.costosEmpresa.rl + pagoEmpleado.costosEmpresa.infotep;

        totalPagado += pagoEmpleado.salarioNeto;
        totalCostoEmp += costoTotal;

        pagosEmpleados.push(pagoEmpleado);
      } catch (error) {
        errores.push({ fila: i + 1, error: error.message });
      }
    }

    if (pagosEmpleados.length === 0) {
      return res.status(400).json({ error: 'No se procesaron empleados válidos' });
    }

    // Crear registro de nómina
    const nominaId = `${empresaId}-${periodo}`;
    const nomina = await prisma.nomina.upsert({
      where: { id: nominaId },
      update: {
        empleadosJson: pagosEmpleados,
        totalPagado: totalPagado,
        totalCostoEmp: totalCostoEmp,
        status: 'Contabilizada', // Marcado como procesado según solicitud
        updatedAt: new Date()
      },
      create: {
        id: nominaId,
        empresaId: parseInt(empresaId),
        periodo: periodo,
        empleadosJson: pagosEmpleados,
        totalPagado: totalPagado,
        totalCostoEmp: totalCostoEmp,
        status: 'Contabilizada', // Marcado como procesado según solicitud
        generadoPor: {
          tipo: 'carga_masiva',
          usuario: req.user?.email || 'sistema',
          fecha: new Date().toISOString()
        }
      }
    });

    res.json({
      success: true,
      message: `Se procesó nómina para ${pagosEmpleados.length} empleados exitosamente`,
      nominaId: nominaId,
      totalPagado: totalPagado,
      totalCostoEmpresa: totalCostoEmp,
      procesados: pagosEmpleados.length,
      errores: errores.length,
      detalleErrores: errores
    });

  } catch (error) {
    console.error('Error en carga masiva de pagos empleados:', error);
    res.status(500).json({ error: 'Error procesando archivo: ' + error.message });
  }
});

module.exports = router;