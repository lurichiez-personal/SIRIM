// src/routes/facturas.js
const { Router } = require("express");
const prisma = require("../db");

const router = Router();

// --- util local: valida campos requeridos (puedes reemplazarlo por el tuyo) ---
function requireFields(obj, fields) {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null);
  if (missing.length) {
    const err = new Error(`Faltan campos requeridos: ${missing.join(", ")}`);
    err.status = 400;
    throw err;
  }
}

// -----------------------------------------------------------------------------
// POST /api/facturas  → Crea factura (opcionalmente asigna NCF)
// Body esperado:
// {
//   empresaId, clienteId, fecha, items: [{codigo, descripcion, cantidad, precioUnitario, subtotal, itemId?}],
//   subtotal, descuentoPorcentaje?, montoDescuento?, aplicaITBIS?, itbis?,
//   aplicaISC?, isc?, aplicaPropina?, propinaLegal?, montoTotal, comments?, auditLog?,
//   asignarNCF?: true, tipo?: "B01" | "B02" | ...
//   ncf?: string   // si ya viene calculado, se respeta
// }
// -----------------------------------------------------------------------------
router.post("/", async (req, res, next) => {
  try {
    requireFields(req.body, [
      "empresaId",
      "clienteId",
      "fecha",
      "items",
      "subtotal",
      "montoTotal",
    ]);

    const empresaId = Number(req.body.empresaId);
    const clienteId = Number(req.body.clienteId);

    if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
      const err = new Error("Debe incluir al menos un item en la factura");
      err.status = 400;
      throw err;
    }

    // --- 1) opcional: asignar NCF automáticamente ---
    let ncf = req.body.ncf;
    if (!ncf && req.body.asignarNCF && req.body.tipo) {
      const seq = await prisma.nCFSequence.findFirst({
        where: { empresaId, tipo: req.body.tipo, activa: true },
      });
      if (!seq) {
        const err = new Error("Secuencia NCF no encontrada");
        err.status = 400;
        throw err;
      }
      if (seq.secuenciaActual > seq.secuenciaHasta) {
        const err = new Error("Secuencia NCF agotada");
        err.status = 409;
        throw err;
      }

      ncf = `${seq.prefijo}${String(seq.secuenciaActual).padStart(8, "0")}`;

      await prisma.nCFSequence.update({
        where: { id: seq.id },
        data: { secuenciaActual: seq.secuenciaActual + 1 },
      });
    }

    // --- 2) validar cliente ---
    const cliente = await prisma.cliente.findUnique({ where: { id: clienteId } });
    if (!cliente) {
      const err = new Error("Cliente no encontrado");
      err.status = 404;
      throw err;
    }

    // --- 3) crear factura + items anidados ---
    const factura = await prisma.factura.create({
      data: {
        empresaId,
        clienteId,
        clienteNombre: cliente.nombre,
        fecha: new Date(req.body.fecha),

        subtotal: req.body.subtotal,
        descuentoPorcentaje: req.body.descuentoPorcentaje ?? 0,
        montoDescuento: req.body.montoDescuento ?? 0,

        aplicaITBIS: !!req.body.aplicaITBIS,
        itbis: req.body.itbis ?? 0,

        aplicaISC: !!req.body.aplicaISC,
        isc: req.body.isc ?? 0,

        aplicaPropina: !!req.body.aplicaPropina,
        propinaLegal: req.body.propinaLegal ?? 0,

        montoTotal: req.body.montoTotal,
        montoPagado: 0,

        ncf,
        estado: "Emitida",

        items: {
          create: req.body.items.map((it) => ({
            codigo: it.codigo,
            descripcion: it.descripcion,
            cantidad: it.cantidad,
            precioUnitario: it.precioUnitario,
            subtotal: it.subtotal,
            itemId: it.itemId ?? null,
          })),
        },

        comments: req.body.comments ?? [],
        auditLog: req.body.auditLog ?? [],
      },
      include: { items: true },
    });

    return res.status(201).json(factura);
  } catch (e) {
    return next(e);
  }
});

// -----------------------------------------------------------------------------
// PUT /api/facturas/:id  → Actualiza factura
// -----------------------------------------------------------------------------
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) {
      const err = new Error("ID inválido");
      err.status = 400;
      throw err;
    }
    const update = await prisma.factura.update({
      where: { id },
      data: req.body,
    });
    return res.json(update);
  } catch (e) {
    return next(e);
  }
});

// -----------------------------------------------------------------------------
// POST /api/facturas/:id/status  → Cambia estado de factura
// Body: { status: "Emitida" | "Anulada" | ... }
// -----------------------------------------------------------------------------
router.post("/:id/status", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;
    if (!status) {
      const err = new Error("status es requerido");
      err.status = 400;
      throw err;
    }
    const f = await prisma.factura.update({
      where: { id },
      data: { estado: status },
    });
    return res.json(f);
  } catch (e) {
    return next(e);
  }
});

// -----------------------------------------------------------------------------
// POST /api/facturas/bulk-status  → Cambia estado de varias facturas
// Body: { ids: number[], status: string }
// -----------------------------------------------------------------------------
router.post("/bulk-status", async (req, res, next) => {
  try {
    const { ids = [], status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      const err = new Error("ids[] y status son requeridos");
      err.status = 400;
      throw err;
    }

    await prisma.factura.updateMany({
      where: { id: { in: ids.map((n) => Number(n)).filter(Number.isFinite) } },
      data: { estado: status },
    });

    return res.json({ ok: true });
  } catch (e) {
    return next(e);
  }
});

// -----------------------------------------------------------------------------
// (Opcional) helper para obtener siguiente NCF sin crear factura
// POST /api/facturas/ncf/next  { empresaId, tipo }
// -----------------------------------------------------------------------------
router.post("/ncf/next", async (req, res, next) => {
  try {
    const empresaId = Number(req.body.empresaId);
    const { tipo } = req.body;
    if (!empresaId || !tipo) {
      return res.status(400).json({ error: "empresaId y tipo son requeridos" });
    }

    const seq = await prisma.nCFSequence.findFirst({
      where: { empresaId, tipo, activa: true },
    });
    if (!seq) return res.status(404).json({ error: "Secuencia no configurada" });
    if (seq.secuenciaActual > seq.secuenciaHasta) {
      return res.status(409).json({ error: "Secuencia NCF agotada" });
    }

    const siguiente = `${seq.prefijo}${String(seq.secuenciaActual).padStart(8, "0")}`;
    return res.json({ ncf: siguiente });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
