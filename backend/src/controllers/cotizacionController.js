const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');
import { initDb } from '../db.js';
import { cotizacionSchema } from '../utils/validation.js';

async function getCotizaciones(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `cotizaciones_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const cotizaciones = await db.all('SELECT * FROM cotizaciones');
    const result = paginate(cotizaciones, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createCotizacion(req, res, next) {
  try {
    const { error } = cotizacionSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { clienteId, monto, fecha, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO cotizaciones (clienteId, monto, fecha, empresaId) VALUES (?, ?, ?, ?)', clienteId, monto, fecha, empresaId);
    res.json({ id: result.lastID, clienteId, monto, fecha, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCotizaciones, createCotizacion };
