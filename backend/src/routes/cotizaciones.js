const express = require('express');
const prisma = require('../db');
const { buildPaging } = require('../utils/pagination');
const router = express.Router();

// GET /api/cotizaciones - Obtener cotizaciones con paginación y filtros
router.get('/', async (req, res, next) => {
  try {
    const empresaId = Number(req.query.empresaId);
    if (!empresaId) {
      const err = new Error('empresaId es requerido');
      err.status = 400;
      throw err;
    }

    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
    const q = (req.query.q || '').toString().trim();
    const status = (req.query.status || '').toString().trim();
    const desde = req.query.desde ? new Date(String(req.query.desde)) : undefined;
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : undefined;

    const where = { empresaId };

    if (q) {
      where.OR = [
        { clienteNombre: { contains: q, mode: 'insensitive' } },
        { id: isNaN(Number(q)) ? undefined : Number(q) }
      ].filter(Boolean);
    }
    if (status) where.estado = status;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = desde;
      if (hasta) where.fecha.lte = hasta;
    }

    const [total, rows] = await Promise.all([
      prisma.cotizacion.count({ where }),
      prisma.cotizacion.findMany({
        where,
        orderBy: { fecha: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize,
        include: { items: true }
      })
    ]);

    return res.json({ page, pageSize, total, rows });
  } catch (e) { next(e); }
});

// GET /api/cotizaciones/:id - Obtener cotización específica
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const empresaId = Number(req.query.empresaId);

    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id, empresaId },
      include: { items: true }
    });

    if (!cotizacion) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    res.json(cotizacion);
  } catch (e) { next(e); }
});

// POST /api/cotizaciones - Crear nueva cotización
router.post('/', async (req, res, next) => {
  try {
    const {
      empresaId, clienteId, clienteNombre, fecha, validaHasta, items,
      subtotal, descuentoPorcentaje, montoDescuento, aplicaITBIS, itbis,
      aplicaISC, isc, aplicaPropina, propinaLegal, montoTotal, estado,
      comments, auditLog
    } = req.body;

    // Validar campos requeridos
    if (!empresaId || !clienteId || !clienteNombre || !fecha || !subtotal || !montoTotal) {
      return res.status(400).json({ 
        error: 'Campos requeridos: empresaId, clienteId, clienteNombre, fecha, subtotal, montoTotal' 
      });
    }

    const cotizacion = await prisma.cotizacion.create({
      data: {
        empresaId: Number(empresaId),
        clienteId: Number(clienteId),
        clienteNombre,
        fecha: new Date(fecha),
        validaHasta: validaHasta ? new Date(validaHasta) : null,
        subtotal: Number(subtotal),
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
        montoDescuento: montoDescuento ? Number(montoDescuento) : null,
        aplicaITBIS: Boolean(aplicaITBIS),
        itbis: Number(itbis || 0),
        aplicaISC: Boolean(aplicaISC),
        isc: isc ? Number(isc) : null,
        aplicaPropina: Boolean(aplicaPropina),
        propinaLegal: propinaLegal ? Number(propinaLegal) : null,
        montoTotal: Number(montoTotal),
        estado: estado || 'Pendiente',
        comments: comments || [],
        auditLog: auditLog || [],
        items: {
          create: (items || []).map(item => ({
            itemId: item.itemId || null,
            codigo: item.codigo,
            descripcion: item.descripcion,
            cantidad: Number(item.cantidad),
            precioUnitario: Number(item.precioUnitario),
            subtotal: Number(item.subtotal)
          }))
        }
      },
      include: { items: true }
    });

    res.status(201).json({ data: cotizacion });
  } catch (e) { next(e); }
});

// PUT /api/cotizaciones/:id - Actualizar cotización
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      empresaId, clienteId, clienteNombre, fecha, validaHasta, items,
      subtotal, descuentoPorcentaje, montoDescuento, aplicaITBIS, itbis,
      aplicaISC, isc, aplicaPropina, propinaLegal, montoTotal, estado,
      comments, auditLog
    } = req.body;

    // Verificar que la cotización existe y pertenece a la empresa
    const existing = await prisma.cotizacion.findFirst({
      where: { id, empresaId: Number(empresaId) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Eliminar items existentes y crear nuevos
    await prisma.cotizacionItem.deleteMany({ where: { cotizacionId: id } });

    const cotizacion = await prisma.cotizacion.update({
      where: { id },
      data: {
        clienteId: Number(clienteId),
        clienteNombre,
        fecha: new Date(fecha),
        validaHasta: validaHasta ? new Date(validaHasta) : null,
        subtotal: Number(subtotal),
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
        montoDescuento: montoDescuento ? Number(montoDescuento) : null,
        aplicaITBIS: Boolean(aplicaITBIS),
        itbis: Number(itbis || 0),
        aplicaISC: Boolean(aplicaISC),
        isc: isc ? Number(isc) : null,
        aplicaPropina: Boolean(aplicaPropina),
        propinaLegal: propinaLegal ? Number(propinaLegal) : null,
        montoTotal: Number(montoTotal),
        estado: estado || existing.estado,
        comments: comments || existing.comments,
        auditLog: auditLog || existing.auditLog,
        items: {
          create: (items || []).map(item => ({
            itemId: item.itemId || null,
            codigo: item.codigo,
            descripcion: item.descripcion,
            cantidad: Number(item.cantidad),
            precioUnitario: Number(item.precioUnitario),
            subtotal: Number(item.subtotal)
          }))
        }
      },
      include: { items: true }
    });

    res.json({ data: cotizacion });
  } catch (e) { next(e); }
});

// DELETE /api/cotizaciones/:id - Eliminar cotización
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const empresaId = Number(req.query.empresaId);

    // Verificar que la cotización existe y pertenece a la empresa
    const existing = await prisma.cotizacion.findFirst({
      where: { id, empresaId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Cotización no encontrada' });
    }

    // Eliminar cotización (items se eliminan por cascada)
    await prisma.cotizacion.delete({ where: { id } });

    res.json({ message: 'Cotización eliminada exitosamente' });
  } catch (e) { next(e); }
});

module.exports = router;