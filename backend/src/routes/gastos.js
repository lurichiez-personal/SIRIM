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
const search = (req.query.search || "").toString();
const { skip, take, page, pageSize } = buildPaging(req);
const where = {
empresaId,
...(search ? { OR: [
{ proveedorNombre: { contains: search, mode: "insensitive" } },
{ ncf: { contains: search, mode: "insensitive" } }
] } : {}),
};
const [total, rows] = await Promise.all([
prisma.gasto.count({ where }),
prisma.gasto.findMany({ where, skip, take, orderBy: { fecha: "desc" } })
]);
res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
requireFields(req.body, ["fecha","subtotal","itbis","monto","descripcion"]);
const created = await prisma.gasto.create({ data: {
empresaId,
proveedorNombre: req.body.proveedorNombre,
rncProveedor: req.body.rncProveedor,
categoriaGasto: req.body.categoriaGasto,
fecha: new Date(req.body.fecha),
subtotal: req.body.subtotal,
itbis: req.body.itbis,
isc: req.body.isc,
propinaLegal: req.body.propinaLegal,
monto: req.body.monto,
ncf: req.body.ncf,
descripcion: req.body.descripcion,
conciliado: false,
aplicaITBIS: !!req.body.aplicaITBIS,
metodoPago: req.body.metodoPago,
comments: req.body.comments || [],
auditLog: req.body.auditLog || []
}});
res.status(201).json(created);
} catch (e) { next(e); }
});


router.put("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const update = await prisma.gasto.update({ where: { id }, data: req.body });
res.json(update);
} catch (e) { next(e); }
});


// DELETE individual gasto
router.delete("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
await prisma.gasto.delete({ where: { id } });
res.json({ success: true, message: 'Gasto eliminado exitosamente' });
} catch (e) { next(e); }
});

// DELETE multiple gastos (bulk delete)
router.delete("/", async (req, res, next) => {
try {
const { ids } = req.body;
if (!Array.isArray(ids) || ids.length === 0) {
return res.status(400).json({ error: 'Se requiere un array de IDs para eliminar' });
}
const result = await prisma.gasto.deleteMany({ 
where: { 
id: { in: ids.map(id => parseInt(id, 10)) } 
} 
});
res.json({ 
success: true, 
message: `${result.count} gastos eliminados exitosamente`,
deletedCount: result.count
});
} catch (e) { next(e); }
});

module.exports = router;