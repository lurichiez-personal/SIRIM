const { Router } = require("express");
const prisma = require("../db");
const { authRequired } = require("../middleware/auth");
const { buildPaging } = require("../utils/pagination");


const router = Router();
router.use(authRequired);


router.get("/", async (req, res, next) => {
try {
const empresaId = parseInt(req.query.empresaId || req.user.empresaId, 10);
const { skip, take, page, pageSize } = buildPaging(req);
const [total, rows] = await Promise.all([
prisma.asientoContable.count({ where: { empresaId } }),
prisma.asientoContable.findMany({ where: { empresaId }, skip, take, orderBy: { fecha: "desc" } })
]);
res.json({ page, pageSize, total, rows });
} catch (e) { next(e); }
});


module.exports = router;