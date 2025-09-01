const { Router } = require("express");
const { prisma } = require("../db");
const { authRequired } = require("../middleware/auth");


const router = Router();
router.use(authRequired);


// Importar transacciones bancarias (CSV procesado en frontend → POST)
router.post("/bank-transactions", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
const txs = req.body.transactions || [];
const created = [];
for (const t of txs) {
const row = await prisma.bankTransaction.create({ data: {
id: t.id,
empresaId,
fecha: new Date(t.fecha),
descripcion: t.descripcion,
monto: t.monto,
tipo: t.tipo
}});
created.push(row);
}
res.status(201).json({ count: created.length });
} catch (e) { next(e); }
});


// Marcar conciliación manual
router.post("/match", async (req, res, next) => {
try {
const empresaId = req.body.empresaId || req.user.empresaId;
const { bankTransactionId, recordType, recordId } = req.body;
const match = await prisma.reconciliationMatch.create({ data: { empresaId, bankTransactionId, recordType, recordId, status: "confirmado" } });
// Opcional: marcar registro como conciliado
if (recordType === 'factura') await prisma.factura.update({ where: { id: recordId }, data: { conciliado: true } });
if (recordType === 'gasto') await prisma.gasto.update({ where: { id: recordId }, data: { conciliado: true } });
if (recordType === 'ingreso') await prisma.ingreso.update({ where: { id: recordId }, data: { conciliado: true } });
res.json(match);
} catch (e) { next(e); }
});


module.exports = router;