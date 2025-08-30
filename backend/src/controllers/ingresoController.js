const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');
import { initDb } from '../db.js';
import { ingresoSchema } from '../utils/validation.js';

async function getIngresos(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `ingresos_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const ingresos = await db.all('SELECT * FROM ingresos');
    const result = paginate(ingresos, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createIngreso(req, res, next) {
  try {
    const { error } = ingresoSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { descripcion, monto, fecha, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO ingresos (descripcion, monto, fecha, empresaId) VALUES (?, ?, ?, ?)', descripcion, monto, fecha, empresaId);
    res.json({ id: result.lastID, descripcion, monto, fecha, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getIngresos, createIngreso };
