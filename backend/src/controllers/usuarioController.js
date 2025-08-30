import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { initDb } from '../db.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const db = await initDb();
    const user = await db.get('SELECT * FROM usuarios WHERE email = ?', email);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!user.activo) return res.status(403).json({ error: 'Usuario inactivo' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas' });
    const token = jwt.sign({ id: user.id, email: user.email, roles: user.roles.split(','), nombre: user.nombre }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, email: user.email, roles: user.roles.split(','), nombre: user.nombre } });
  } catch (err) {
    next(err);
  }
}

export async function createMasterUser() {
  const db = await initDb();
  const exists = await db.get('SELECT * FROM usuarios WHERE email = ?', 'lurichiez@gmail.com');
  if (!exists) {
    const hash = await bcrypt.hash('Alonso260990#', 10);
    await db.run('INSERT INTO usuarios (nombre, email, password, roles, activo) VALUES (?, ?, ?, ?, ?)',
      'Lurichiez', 'lurichiez@gmail.com', hash, 'master,admin', 1);
  }
}

export async function getUsuarios(req, res, next) {
  try {
    const db = await initDb();
    const usuarios = await db.all('SELECT id, nombre, email, roles, activo FROM usuarios');
    res.json(usuarios);
  } catch (err) {
    next(err);
  }
}
