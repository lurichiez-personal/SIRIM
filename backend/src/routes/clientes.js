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
const search = (req.query.search || "").toString().toLowerCase();
const status = (req.query.status || "").toString(); // "todos" | "activo" | "inactivo"
const { skip, take, page, pageSize } = buildPaging(req);


const where = {
empresaId,
...(status === "activo" ? { activo: true } : status === "inactivo" ? { activo: false } : {}),
...(search ? { OR: [
{ nombre: { contains: search, mode: "insensitive" } },
{ rnc: { contains: search, mode: "insensitive" } }
] } : {}),
};


const [total, rows] = await Promise.all([
prisma.cliente.count({ where }),
prisma.cliente.findMany({ where, skip, take, orderBy: { createdAt: "desc" } })
]);


res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
requireFields(req.body, ["nombre"]);
const empresaId = req.body.empresaId || req.user.empresaId;
const cliente = await prisma.cliente.create({ data: { empresaId, nombre: req.body.nombre, rnc: req.body.rnc, email: req.body.email, telefono: req.body.telefono, condicionesPago: req.body.condicionesPago, estadoDGII: req.body.estadoDGII } });
res.status(201).json(cliente);
} catch (e) { next(e); }
});


router.put("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const update = await prisma.cliente.update({ where: { id }, data: req.body });
res.json(update);
} catch (e) { next(e); }
});


router.post("/bulk-status", async (req, res, next) => {
try {
const { ids = [], activo } = req.body;
await prisma.cliente.updateMany({ where: { id: { in: ids } }, data: { activo: !!activo } });
res.json({ ok: true });
} catch (e) { next(e); }
});


// DELETE individual cliente
router.delete("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
await prisma.cliente.delete({ where: { id } });
res.json({ success: true, message: 'Cliente eliminado exitosamente' });
} catch (e) { next(e); }
});

// DELETE multiple clientes (bulk delete)
router.delete("/", async (req, res, next) => {
try {
const { ids } = req.body;
if (!Array.isArray(ids) || ids.length === 0) {
return res.status(400).json({ error: 'Se requiere un array de IDs para eliminar' });
}
const result = await prisma.cliente.deleteMany({ 
where: { 
id: { in: ids.map(id => parseInt(id, 10)) } 
} 
});
res.json({ 
success: true, 
message: `${result.count} clientes eliminados exitosamente`,
deletedCount: result.count
});
} catch (e) { next(e); }
});

module.exports = router;