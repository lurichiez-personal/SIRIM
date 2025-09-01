const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { prisma } = require("../db");
const { requireFields } = require("../utils/validators");


const router = Router();


router.post("/register", async (req, res, next) => {
try {
requireFields(req.body, ["nombre", "email", "password"]);
const { nombre, email, password, empresaId, roles = ["Admin"], authMethod = "local" } = req.body;
const exists = await prisma.user.findUnique({ where: { email } });
if (exists) return res.status(409).json({ error: "Email ya registrado" });
const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.create({ data: { nombre, email, password: hash, roles, authMethod, empresaId } });
res.status(201).json({ id: user.id, email: user.email, nombre: user.nombre, roles: user.roles, empresaId: user.empresaId });
} catch (e) { next(e); }
});


router.post("/login", async (req, res, next) => {
try {
requireFields(req.body, ["email", "password"]);
const { email, password } = req.body;
const user = await prisma.user.findUnique({ where: { email } });
if (!user || !user.activo) return res.status(401).json({ error: "Credenciales inválidas" });
const ok = await bcrypt.compare(password, user.password);
if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });
const token = jwt.sign({ email: user.email, roles: user.roles, empresaId: user.empresaId }, process.env.JWT_SECRET, { subject: user.id, expiresIn: "7d" });
res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, roles: user.roles, empresaId: user.empresaId } });
} catch (e) { next(e); }
});


router.get("/me", async (req, res) => {
// opcional: no requiere token si prefieres devolver nada
res.json({ ok: true });
});


module.exports = router;