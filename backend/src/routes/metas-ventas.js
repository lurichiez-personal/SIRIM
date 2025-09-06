const express = require('express');
const prisma = require('../db').prisma;
const router = express.Router();

// GET /api/metas-ventas - Obtener metas de ventas por empresa
router.get('/', async (req, res) => {
  try {
    const { empresaId, ano, mes } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    const where = {
      empresaId: parseInt(empresaId),
      ...(ano && { ano: parseInt(ano) }),
      ...(mes && { mes: parseInt(mes) })
    };

    const metas = await prisma.metaVentas.findMany({
      where,
      orderBy: [
        { ano: 'desc' },
        { mes: 'desc' }
      ]
    });

    res.json(metas);
  } catch (error) {
    console.error('Error obteniendo metas de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/metas-ventas/actual - Obtener meta del mes actual
router.get('/actual', async (req, res) => {
  try {
    const { empresaId } = req.query;
    
    if (!empresaId) {
      return res.status(400).json({ error: 'empresaId es requerido' });
    }

    const now = new Date();
    const ano = now.getFullYear();
    const mes = now.getMonth() + 1;

    const meta = await prisma.metaVentas.findUnique({
      where: {
        empresaId_ano_mes: {
          empresaId: parseInt(empresaId),
          ano: ano,
          mes: mes
        }
      }
    });

    if (!meta) {
      return res.json({
        id: 0,
        empresaId: parseInt(empresaId),
        ano: ano,
        mes: mes,
        metaMensual: 0,
        notas: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.json(meta);
  } catch (error) {
    console.error('Error obteniendo meta actual:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/metas-ventas - Crear o actualizar meta de ventas
router.post('/', async (req, res) => {
  try {
    const { empresaId, ano, mes, metaMensual, notas } = req.body;

    if (!empresaId || !ano || !mes || metaMensual === undefined) {
      return res.status(400).json({ 
        error: 'empresaId, ano, mes y metaMensual son requeridos' 
      });
    }

    if (mes < 1 || mes > 12) {
      return res.status(400).json({ 
        error: 'mes debe estar entre 1 y 12' 
      });
    }

    if (metaMensual < 0) {
      return res.status(400).json({ 
        error: 'metaMensual debe ser mayor o igual a 0' 
      });
    }

    const meta = await prisma.metaVentas.upsert({
      where: {
        empresaId_ano_mes: {
          empresaId: parseInt(empresaId),
          ano: parseInt(ano),
          mes: parseInt(mes)
        }
      },
      update: {
        metaMensual: parseFloat(metaMensual),
        notas: notas || null
      },
      create: {
        empresaId: parseInt(empresaId),
        ano: parseInt(ano),
        mes: parseInt(mes),
        metaMensual: parseFloat(metaMensual),
        notas: notas || null
      }
    });

    res.json(meta);
  } catch (error) {
    console.error('Error guardando meta de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/metas-ventas/:id - Actualizar meta específica
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { metaMensual, notas } = req.body;

    if (metaMensual !== undefined && metaMensual < 0) {
      return res.status(400).json({ 
        error: 'metaMensual debe ser mayor o igual a 0' 
      });
    }

    const meta = await prisma.metaVentas.update({
      where: { id: parseInt(id) },
      data: {
        ...(metaMensual !== undefined && { metaMensual: parseFloat(metaMensual) }),
        ...(notas !== undefined && { notas: notas || null })
      }
    });

    res.json(meta);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Meta de ventas no encontrada' });
    }
    console.error('Error actualizando meta de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/metas-ventas/:id - Eliminar meta específica
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.metaVentas.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Meta de ventas eliminada exitosamente' });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Meta de ventas no encontrada' });
    }
    console.error('Error eliminando meta de ventas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;