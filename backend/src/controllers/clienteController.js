
const { initDb } = require('../db.js');
const { clienteSchema } = require('../utils/validation.js');
const { paginate } = require('../utils/pagination.js');
const { setCache, getCache } = require('../utils/cache.js');

async function getClientes(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const cacheKey = `clientes_${page}_${pageSize}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);
    const db = await initDb();
    const clientes = await db.all('SELECT * FROM clientes');
    const result = paginate(clientes, page, pageSize);
    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createCliente(req, res, next) {
  try {
    const { error } = clienteSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });
    const { nombre, rnc, empresaId } = req.body;
    const db = await initDb();
    const result = await db.run('INSERT INTO clientes (nombre, rnc, empresaId) VALUES (?, ?, ?)', nombre, rnc, empresaId);
    res.json({ id: result.lastID, nombre, rnc, empresaId });
  } catch (err) {
    next(err);
  }
}

module.exports = { getClientes, createCliente };
