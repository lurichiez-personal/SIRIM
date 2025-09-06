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
const [total, rows] = await Promise.all([
prisma.empleado.count({ where: { empresaId } }),
prisma.empleado.findMany({ where: { empresaId }, skip, take, orderBy: { id: "desc" } })
]);
res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
requireFields(req.body, ["nombre","cedula","puesto","salarioBrutoMensual","fechaIngreso"]);
const created = await prisma.empleado.create({ data: {
empresaId,
nombre: req.body.nombre,
cedula: req.body.cedula,
puesto: req.body.puesto,
salarioBrutoMensual: req.body.salarioBrutoMensual,
fechaIngreso: new Date(req.body.fechaIngreso),
activo: req.body.activo !== false
}});
res.status(201).json(created);
} catch (e) { next(e); }
});


router.put("/:id", async (req, res, next) => {
try {
const id = parseInt(req.params.id, 10);
const updated = await prisma.empleado.update({ where: { id }, data: req.body });
res.json(updated);
} catch (e) { next(e); }
});


module.exports = router;