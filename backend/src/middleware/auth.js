const jwt = require("jsonwebtoken");


function authRequired(req, res, next) {
const auth = req.headers.authorization || "";
const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
if (!token) return res.status(401).json({ error: "Token requerido" });
try {
const payload = jwt.verify(token, process.env.JWT_SECRET);
req.user = { id: payload.sub, email: payload.email, roles: payload.roles, empresaId: payload.empresaId };
return next();
} catch (e) {
return res.status(401).json({ error: "Token inválido o expirado" });
}
}


function requireRole(...roles) {
return (req, res, next) => {
const userRoles = req.user?.roles || [];
const ok = roles.some(r => userRoles.includes(r));
if (!ok) return res.status(403).json({ error: "Permisos insuficientes" });
next();
};
}


module.exports = { authRequired, requireRole };