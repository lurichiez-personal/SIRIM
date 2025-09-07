const { Router } = require("express");
const { prisma } = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireFields } = require("../utils/validators");


const router = Router();
router.use(authRequired);


router.get("/sequences", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const seqs = await prisma.nCFSequence.findMany({ where: { empresaId }, orderBy: { id: "asc" } });
res.json(seqs);
} catch (e) { next(e); }
});


router.post("/sequences", async (req, res, next) => {
try {
requireFields(req.body, ["tipo","prefijo","secuenciaDesde","secuenciaHasta","fechaVencimiento"]);
const empresaId = req.body.empresaId || req.user.empresaId;
const created = await prisma.nCFSequence.create({ data: { empresaId, tipo: req.body.tipo, prefijo: req.body.prefijo, secuenciaDesde: req.body.secuenciaDesde, secuenciaHasta: req.body.secuenciaHasta, secuenciaActual: req.body.secuenciaDesde, fechaVencimiento: new Date(req.body.fechaVencimiento) } });
res.status(201).json(created);
} catch (e) { next(e); }
});


router.post("/next", async (req, res, next) => {
try {
requireFields(req.body, ["tipo"]);
const empresaId = req.body.empresaId || req.user.empresaId;
const tipo = req.body.tipo;
const seq = await prisma.nCFSequence.findFirst({ where: { empresaId, tipo, activa: true } });
if (!seq) return res.status(404).json({ error: "Secuencia no encontrada o inactiva" });
if (seq.secuenciaActual > seq.secuenciaHasta) return res.status(409).json({ error: "Secuencia agotada" });
const ncf = `${seq.prefijo}${String(seq.secuenciaActual).padStart(8, "0")}`;
await prisma.nCFSequence.update({ where: { id: seq.id }, data: { secuenciaActual: seq.secuenciaActual + 1 } });
res.json({ ncf });
} catch (e) { next(e); }
});


module.exports = router;