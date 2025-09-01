const { Router } = require("express");
requireFields(req.body, ["clienteId","fecha","items","subtotal","itbis","montoTotal"]);


// Si envías { asignarNCF: true, tipo: "B01" } → genera NCF
let ncf = req.body.ncf;
if (!ncf && req.body.asignarNCF && req.body.tipo) {
const seq = await prisma.nCFSequence.findFirst({ where: { empresaId, tipo: req.body.tipo, activa: true } });
if (!seq) throw Object.assign(new Error("Secuencia NCF no encontrada"), { status: 400 });
if (seq.secuenciaActual > seq.secuenciaHasta) throw Object.assign(new Error("Secuencia NCF agotada"), { status: 409 });
ncf = `${seq.prefijo}${String(seq.secuenciaActual).padStart(8, "0")}`;
await prisma.nCFSequence.update({ where: { id: seq.id }, data: { secuenciaActual: seq.secuenciaActual + 1 } });
}


const cliente = await prisma.cliente.findUnique({ where: { id: req.body.clienteId } });
if (!cliente) throw Object.assign(new Error("Cliente no encontrado"), { status: 404 });


const factura = await prisma.factura.create({
data: {
empresaId,
clienteId: cliente.id,
clienteNombre: cliente.nombre,
fecha: new Date(req.body.fecha),
subtotal: req.body.subtotal,
descuentoPorcentaje: req.body.descuentoPorcentaje,
montoDescuento: req.body.montoDescuento,
aplicaITBIS: !!req.body.aplicaITBIS,
aplicaISC: !!req.body.aplicaISC,
isc: req.body.isc,
itbis: req.body.itbis,
aplicaPropina: !!req.body.aplicaPropina,
propinaLegal: req.body.propinaLegal,
montoTotal: req.body.montoTotal,
montoPagado: 0,
ncf,
estado: "Emitida",
items: { create: req.body.items.map(it => ({ codigo: it.codigo, descripcion: it.descripcion, cantidad: it.cantidad, precioUnitario: it.precioUnitario, subtotal: it.subtotal, itemId: it.itemId || null })) },
comments: req.body.comments || [],
auditLog: req.body.auditLog || [],
},
include: { items: true }
});


res.status(201).json(factura);
} catch (e) { next(e); }
});


router.put("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const update = await prisma.factura.update({ where: { id }, data: req.body });
res.json(update);
} catch (e) { next(e); }
});


router.post("/:id/status", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const { status } = req.body;
const f = await prisma.factura.update({ where: { id }, data: { estado: status } });
res.json(f);
} catch (e) { next(e); }
});


router.post("/bulk-status", async (req, res, next) => {
try {
const { ids = [], status } = req.body;
await prisma.factura.updateMany({ where: { id: { in: ids } }, data: { estado: status } });
res.json({ ok: true });
} catch (e) { next(e); }
});


module.exports = router;