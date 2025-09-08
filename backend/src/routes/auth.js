const { Router } = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db");
const { requireFields } = require("../utils/validators");


const router = Router();


router.post("/register", async (req, res, next) => {
try {
requireFields(req.body, ["nombre", "email", "password"]);
const { nombre, email, password, empresaId, role = "client" } = req.body;
const exists = await prisma.user.findUnique({ where: { email } });
if (exists) return res.status(409).json({ error: "Email ya registrado" });
const hash = await bcrypt.hash(password, 10);
const user = await prisma.user.create({ data: { nombre, email, password: hash, role, empresaId } });
res.status(201).json({ id: user.id, email: user.email, nombre: user.nombre, role: user.role, empresaId: user.empresaId });
} catch (e) { next(e); }
});


router.post("/login", async (req, res, next) => {
try {
requireFields(req.body, ["email", "password"]);
const { email, password } = req.body;
const user = await prisma.user.findUnique({ where: { email } });
if (!user || !user.active) return res.status(401).json({ error: "Credenciales inválidas" });
const ok = await bcrypt.compare(password, user.password);
if (!ok) return res.status(401).json({ error: "Credenciales inválidas" });
const token = jwt.sign({ email: user.email, role: user.role, roles: [user.role], empresaId: user.empresaId }, process.env.JWT_SECRET, { subject: user.id.toString(), expiresIn: "7d" });
res.json({ token, user: { id: user.id, email: user.email, nombre: user.nombre, role: user.role, roles: [user.role], empresaId: user.empresaId } });
} catch (e) { next(e); }
});


router.get("/me", async (req, res) => {
// opcional: no requiere token si prefieres devolver nada
res.json({ ok: true });
});


router.post("/forgot-password", async (req, res, next) => {
try {
requireFields(req.body, ["email"]);
const { email } = req.body;

// Buscar usuario
const user = await prisma.user.findUnique({ where: { email } });

// Por seguridad, siempre devolver éxito (no revelar si el email existe)
if (user && user.active) {
  // Generar nueva contraseña temporal
  const tempPassword = Math.random().toString(36).slice(-12);
  const hash = await bcrypt.hash(tempPassword, 10);
  
  // Actualizar contraseña en base de datos
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hash }
  });

  // Enviar email con nueva contraseña
  try {
    const emailService = require('../services/emailService');
    const emailData = {
      to: user.email,
      subject: 'SIRIM - Nueva Contraseña Temporal',
      html: `
        <h2>Recuperación de Contraseña - SIRIM</h2>
        <p>Hola ${user.nombre},</p>
        <p>Su nueva contraseña temporal es: <strong>${tempPassword}</strong></p>
        <p>Por favor, inicie sesión con esta contraseña y cámbiela inmediatamente por una de su preferencia.</p>
        <p>Si no solicitó este cambio, contacte soporte inmediatamente.</p>
        <br>
        <p>Saludos,<br>Equipo SIRIM</p>
      `
    };
    
    await emailService.sendEmail(emailData);
    console.log(`Contraseña temporal enviada a: ${user.email}`);
  } catch (emailError) {
    console.error('Error enviando email de recuperación:', emailError);
  }
}

// Siempre responder éxito por seguridad
res.json({ 
  success: true, 
  message: 'Si el correo existe en nuestros registros, hemos enviado las instrucciones de recuperación.' 
});

} catch (e) { 
next(e); 
}
});

module.exports = router;