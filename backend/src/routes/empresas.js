const { Router } = require("express");
const prisma = require("../db");
const { authRequired } = require("../middleware/auth");
const { requireFields } = require("../utils/validators");


const router = Router();
router.use(authRequired);


router.get("/", async (req, res, next) => {
try {
const empresas = await prisma.empresa.findMany({ orderBy: { id: "asc" } });
res.json(empresas);
} catch (e) { next(e); }
});


router.post("/", async (req, res, next) => {
try {
requireFields(req.body, ["nombre", "rnc"]);
const empresa = await prisma.empresa.create({ data: { nombre: req.body.nombre, rnc: req.body.rnc } });
res.status(201).json(empresa);
} catch (e) { next(e); }
});


module.exports = router;