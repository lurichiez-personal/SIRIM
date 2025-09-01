const { Router } = require("express");
const { prisma } = require("../db");
const { authRequired } = require("../middleware/auth");
const { buildPaging } = require("../utils/pagination");
const { requireFields } = require("../utils/validators");


const router = Router();
router.use(authRequired);


router.get("/", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const search = (req.query.search || "").toString().toLowerCase();
const { skip, take, page, pageSize } = buildPaging(req);


const where = {
empresaId,
...(search ? { OR: [
{ nombre: { contains: search, mode: "insensitive" } },
{ codigo: { contains: search, mode: "insensitive" } }
] } : {}),
};


const [total, rows] = await Promise.all([
prisma.item.count({ where }),
prisma.item.findMany({ where, skip, take, orderBy: { id: "desc" } })
]);


res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
requireFields(req.body, ["codigo", "nombre", "precio"]);
const empresaId = req.body.empresaId || req.user.empresaId;
const created = await prisma.item.create({ data: { empresaId, codigo: req.body.codigo, nombre: req.body.nombre, descripcion: req.body.descripcion, precio: req.body.precio, costo: req.body.costo, cantidadDisponible: req.body.cantidadDisponible } });
res.status(201).json(created);
} catch (e) { next(e); }
});


router.put("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const updated = await prisma.item.update({ where: { id }, data: req.body });
res.json(updated);
} catch (e) { next(e); }
});


module.exports = router;