const { Router } = require("express");
const prisma = require("../db");
const { authRequired } = require("../middleware/auth");
const { buildPaging } = require("../utils/pagination");
const { requireFields } = require("../utils/validators");


const router = Router();
router.use(authRequired);


router.get("/", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const { skip, take, page, pageSize } = buildPaging(req);
const where = { empresaId };
const [total, rows] = await Promise.all([
prisma.ingreso.count({ where }),
prisma.ingreso.findMany({ where, skip, take, orderBy: { fecha: "desc" }, include: { cliente: true } })
]);
res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
requireFields(req.body, ["clienteId","fecha","monto","metodoPago"]);


const cliente = await prisma.cliente.findUnique({ where: { id: req.body.clienteId } });
if (!cliente) throw Object.assign(new Error("Cliente no encontrado"), { status: 404 });


const created = await prisma.ingreso.create({ data: {
empresaId,
clienteId: cliente.id,
clienteNombre: cliente.nombre,
facturaId: req.body.facturaId || null,
fecha: new Date(req.body.fecha),
monto: req.body.monto,
metodoPago: req.body.metodoPago,
notas: req.body.notas,
conciliado: false
}});


// Si está vinculado a factura, actualizar montoPagado y estado
if (req.body.facturaId) {
const pagos = await prisma.ingreso.aggregate({ _sum: { monto: true }, where: { facturaId: req.body.facturaId } });
const factura = await prisma.factura.findUnique({ where: { id: req.body.facturaId } });
const pagado = pagos._sum.monto || 0;
const estado = pagado >= Number(factura.montoTotal) ? "Pagada" : (pagado > 0 ? "PagadaParcialmente" : "Emitida");
await prisma.factura.update({ where: { id: factura.id }, data: { montoPagado: pagado, estado } });
}


res.status(201).json(created);
} catch (e) { next(e); }
});


module.exports = router;