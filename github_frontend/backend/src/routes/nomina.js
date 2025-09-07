const { Router } = require("express");
const { prisma } = require("../db");
const { authRequired } = require("../middleware/auth");


const router = Router();
router.use(authRequired);


// Obtener nómina por periodo (YYYY-MM)
router.get("/:periodo", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const periodo = req.params.periodo;
const nom = await prisma.nomina.findUnique({ where: { id: periodo } });
if (!nom || nom.empresaId !== empresaId) return res.status(404).json({ error: "No encontrada" });
res.json(nom);
} catch (e) { next(e); }
});


// Crear/generar nómina del periodo (carga empleadosJson calculado en frontend)
router.post("/", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
const { periodo, empleados, totalPagado, totalCostoEmpresa, generadoPor } = req.body;
const created = await prisma.nomina.create({ data: {
id: periodo,
empresaId,
periodo,
empleadosJson: empleados,
totalPagado,
totalCostoEmp: totalCostoEmpresa,
status: "PendienteAuditoria",
generadoPor
}});
res.status(201).json(created);
} catch (e) { next(e); }
});


router.post("/:periodo/auditar", async (req, res, next) => {
try {
const periodo = req.params.periodo;
const updated = await prisma.nomina.update({ where: { id: periodo }, data: { status: "Auditada" } });
res.json(updated);
} catch (e) { next(e); }
});


router.post("/:periodo/contabilizar", async (req, res, next) => {
try {
const periodo = req.params.periodo;
const { asiento } = req.body; // { id, fecha, descripcion, entradas[] }
const nom = await prisma.nomina.update({ where: { id: periodo }, data: { status: "Contabilizada", asientoId: asiento.id } });
await prisma.asientoContable.create({ data: {
id: asiento.id,
empresaId: nom.empresaId,
fecha: new Date(asiento.fecha),
descripcion: asiento.descripcion,
transaccionId: nom.id,
transaccionTipo: "nomina",
entradas: asiento.entradas
}});
res.json(nom);
} catch (e) { next(e); }
});


module.exports = router;