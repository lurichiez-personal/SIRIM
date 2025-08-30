const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');
import { initDb } from '../db.js';
import { notaSchema } from '../utils/validation.js';

async function getNotas(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `notas_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const notas = await db.all('SELECT * FROM notas');
    const result = paginate(notas, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createNota(req, res, next) {
  try {
    const { error } = notaSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { tipo, monto, fecha, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO notas (tipo, monto, fecha, empresaId) VALUES (?, ?, ?, ?)', tipo, monto, fecha, empresaId);
    res.json({ id: result.lastID, tipo, monto, fecha, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getNotas, createNota };
