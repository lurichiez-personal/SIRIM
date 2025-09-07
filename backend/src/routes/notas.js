const express = require('express');
const { prisma } = require('../db');
const { buildPaging } = require('../utils/pagination');
const router = express.Router();

// GET /api/notas - Obtener notas de crédito/débito con paginación y filtros
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
    const tipo = (req.query.tipo || '').toString().trim();
    const desde = req.query.desde ? new Date(String(req.query.desde)) : undefined;
    const hasta = req.query.hasta ? new Date(String(req.query.hasta)) : undefined;

    const where = { empresaId };

    if (q) {
      where.OR = [
        { clienteNombre: { contains: q, mode: 'insensitive' } },
        { ncf: { contains: q, mode: 'insensitive' } },
        { facturaAfectadaNCF: { contains: q, mode: 'insensitive' } }
      ];
    }
    if (tipo) where.tipo = tipo;
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = desde;
      if (hasta) where.fecha.lte = hasta;
    }

    const [total, rows] = await Promise.all([
      prisma.notaCreditoDebito.count({ where }),
      prisma.notaCreditoDebito.findMany({
        where,
        orderBy: { fecha: 'desc' },
        take: pageSize,
        skip: (page - 1) * pageSize
      })
    ]);

    return res.json({ page, pageSize, total, rows });
  } catch (e) { next(e); }
});

// GET /api/notas/:id - Obtener nota específica
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const empresaId = Number(req.query.empresaId);

    const nota = await prisma.notaCreditoDebito.findFirst({
      where: { id, empresaId }
    });

    if (!nota) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    res.json(nota);
  } catch (e) { next(e); }
});

// POST /api/notas - Crear nueva nota de crédito/débito
router.post('/', async (req, res, next) => {
  try {
    const {
      empresaId, tipo, facturaAfectadaId, facturaAfectadaNCF, ncf, fecha,
      clienteId, clienteNombre, subtotal, descuentoPorcentaje, montoDescuento,
      aplicaITBIS, aplicaISC, isc, itbis, aplicaPropina, propinaLegal,
      montoTotal, codigoModificacion, descripcion, asientoId
    } = req.body;

    // Validar campos requeridos
    if (!empresaId || !tipo || !facturaAfectadaId || !facturaAfectadaNCF || !ncf || !fecha || !clienteId || !clienteNombre || !subtotal || !montoTotal || !codigoModificacion || !descripcion) {
      return res.status(400).json({ 
        error: 'Campos requeridos: empresaId, tipo, facturaAfectadaId, facturaAfectadaNCF, ncf, fecha, clienteId, clienteNombre, subtotal, montoTotal, codigoModificacion, descripcion' 
      });
    }

    const nota = await prisma.notaCreditoDebito.create({
      data: {
        empresaId: Number(empresaId),
        tipo,
        facturaAfectadaId: Number(facturaAfectadaId),
        facturaAfectadaNCF,
        ncf,
        fecha: new Date(fecha),
        clienteId: Number(clienteId),
        clienteNombre,
        subtotal: Number(subtotal),
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
        montoDescuento: montoDescuento ? Number(montoDescuento) : null,
        aplicaITBIS: Boolean(aplicaITBIS),
        aplicaISC: Boolean(aplicaISC),
        isc: Number(isc || 0),
        itbis: Number(itbis || 0),
        aplicaPropina: Boolean(aplicaPropina),
        propinaLegal: Number(propinaLegal || 0),
        montoTotal: Number(montoTotal),
        codigoModificacion,
        descripcion,
        asientoId: asientoId || null
      }
    });

    res.status(201).json({ data: nota });
  } catch (e) { next(e); }
});

// PUT /api/notas/:id - Actualizar nota
router.put('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const {
      empresaId, tipo, facturaAfectadaId, facturaAfectadaNCF, ncf, fecha,
      clienteId, clienteNombre, subtotal, descuentoPorcentaje, montoDescuento,
      aplicaITBIS, aplicaISC, isc, itbis, aplicaPropina, propinaLegal,
      montoTotal, codigoModificacion, descripcion, asientoId
    } = req.body;

    // Verificar que la nota existe y pertenece a la empresa
    const existing = await prisma.notaCreditoDebito.findFirst({
      where: { id, empresaId: Number(empresaId) }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    const nota = await prisma.notaCreditoDebito.update({
      where: { id },
      data: {
        tipo,
        facturaAfectadaId: Number(facturaAfectadaId),
        facturaAfectadaNCF,
        ncf,
        fecha: new Date(fecha),
        clienteId: Number(clienteId),
        clienteNombre,
        subtotal: Number(subtotal),
        descuentoPorcentaje: descuentoPorcentaje ? Number(descuentoPorcentaje) : null,
        montoDescuento: montoDescuento ? Number(montoDescuento) : null,
        aplicaITBIS: Boolean(aplicaITBIS),
        aplicaISC: Boolean(aplicaISC),
        isc: Number(isc || 0),
        itbis: Number(itbis || 0),
        aplicaPropina: Boolean(aplicaPropina),
        propinaLegal: Number(propinaLegal || 0),
        montoTotal: Number(montoTotal),
        codigoModificacion,
        descripcion,
        asientoId: asientoId || existing.asientoId
      }
    });

    res.json({ data: nota });
  } catch (e) { next(e); }
});

// DELETE /api/notas/:id - Eliminar nota
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const empresaId = Number(req.query.empresaId);

    // Verificar que la nota existe y pertenece a la empresa
    const existing = await prisma.notaCreditoDebito.findFirst({
      where: { id, empresaId }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Nota no encontrada' });
    }

    // Eliminar nota
    await prisma.notaCreditoDebito.delete({ where: { id } });

    res.json({ message: 'Nota eliminada exitosamente' });
  } catch (e) { next(e); }
});

module.exports = router;