const { Router } = require("express");
const prisma = require("../db");
const { authRequired } = require("../middleware/auth");


const router = Router();
router.use(authRequired);


// Dataset para 606 (compras/gastos)
router.get("/606", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const start = new Date(req.query.startDate);
const end = new Date(req.query.endDate);
const gastos = await prisma.gasto.findMany({ where: { empresaId, fecha: { gte: start, lte: end } }, orderBy: { fecha: "asc" } });
res.json(gastos);
} catch (e) { next(e); }
});


// Dataset para 607 (ventas)
router.get("/607", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const start = new Date(req.query.startDate);
const end = new Date(req.query.endDate);
const facturas = await prisma.factura.findMany({ where: { empresaId, fecha: { gte: start, lte: end }, estado: { in: ["Emitida","Pagada","PagadaParcialmente","Vencida"] } }, orderBy: { fecha: "asc" } });
res.json(facturas);
} catch (e) { next(e); }
});


// Dataset para 608 (anuladas)
router.get("/608", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const start = new Date(req.query.startDate);
const end = new Date(req.query.endDate);
const anuladas = await prisma.factura.findMany({ where: { empresaId, fecha: { gte: start, lte: end }, estado: "Anulada" }, orderBy: { fecha: "asc" } });
res.json(anuladas);
} catch (e) { next(e); }
});


module.exports = router;