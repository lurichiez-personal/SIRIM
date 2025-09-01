import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import pool from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

async function init() {
  await pool.query(`CREATE TABLE IF NOT EXISTS facturas (
    id UUID PRIMARY KEY,
    empresa_id TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`);
}
init().catch(err => console.error('DB init error', err));

app.get('/api/facturas', async (req, res) => {
  try {
    const { empresaId } = req.query;
    let result;
    if (empresaId) {
      result = await pool.query('SELECT data FROM facturas WHERE empresa_id = $1 ORDER BY created_at DESC', [empresaId]);
    } else {
      result = await pool.query('SELECT data FROM facturas ORDER BY created_at DESC');
    }
    const facturas = result.rows.map(r => r.data);
    res.json(facturas);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching facturas' });
  }
});

app.post('/api/facturas', async (req, res) => {
  try {
    const id = uuidv4();
    const factura = { id, ...req.body };
    await pool.query('INSERT INTO facturas (id, empresa_id, data) VALUES ($1, $2, $3)', [id, req.body.empresaId, factura]);
    res.status(201).json(factura);
  } catch (err) {
    res.status(500).json({ message: 'Error creating factura' });
  }
});

app.get('/api/facturas/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT data FROM facturas WHERE id = $1', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Factura not found' });
    }
    res.json(rows[0].data);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching factura' });
  }
});

app.listen(PORT, () => {
  console.log(`SIRIM backend running on port ${PORT}`);
});
