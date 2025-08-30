import { paginate } from '../utils/pagination.js';
import { setCache, getCache } from '../utils/cache.js';
import { initDb } from '../db.js';

async function getFacturas(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `facturas_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const facturas = await db.all('SELECT * FROM facturas');
    const result = paginate(facturas, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createFactura(req, res, next) {
  try {
    const { clienteId, monto, fecha, estado, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO facturas (clienteId, monto, fecha, estado, empresaId) VALUES (?, ?, ?, ?, ?)', clienteId, monto, fecha, estado, empresaId);
    res.json({ id: result.lastID, clienteId, monto, fecha, estado, empresaId });
  } catch (err) {
    next(err);
  }
}
  module.exports = { getFacturas, createFactura };
