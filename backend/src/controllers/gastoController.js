const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');
import { initDb } from '../db.js';
import { gastoSchema } from '../utils/validation.js';

async function getGastos(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `gastos_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const gastos = await db.all('SELECT * FROM gastos');
    const result = paginate(gastos, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createGasto(req, res, next) {
  try {
    const { error } = gastoSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { descripcion, monto, fecha, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO gastos (descripcion, monto, fecha, empresaId) VALUES (?, ?, ?, ?)', descripcion, monto, fecha, empresaId);
    res.json({ id: result.lastID, descripcion, monto, fecha, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getGastos, createGasto };
