const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');
import { initDb } from '../db.js';
import { facturaRecurrenteSchema } from '../utils/validation.js';

async function getFacturasRecurrentes(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `facturasRecurrentes_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const facturas = await db.all('SELECT * FROM facturas_recurrentes');
    const result = paginate(facturas, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createFacturaRecurrente(req, res, next) {
  try {
    const { error } = facturaRecurrenteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { clienteId, monto, frecuencia, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO facturas_recurrentes (clienteId, monto, frecuencia, empresaId) VALUES (?, ?, ?, ?)', clienteId, monto, frecuencia, empresaId);
    res.json({ id: result.lastID, clienteId, monto, frecuencia, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFacturasRecurrentes, createFacturaRecurrente };
