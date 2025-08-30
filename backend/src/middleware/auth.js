import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}


import { hasRole, hasAnyRole } from '../utils/roles.js';

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || !hasRole(req.user, role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}

export function requireAnyRole(roles) {
  return (req, res, next) => {
    if (!req.user || !hasAnyRole(req.user, roles)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    next();
  };
}
