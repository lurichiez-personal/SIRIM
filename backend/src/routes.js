
import { Router } from 'express';
import { login, getUsuarios, createMasterUser } from './controllers/usuarioController.js';
import { getClientes, createCliente } from './controllers/clienteController.js';
import { getFacturas, createFactura } from './controllers/facturaController.js';
import { getGastos, createGasto } from './controllers/gastoController.js';
import { getCotizaciones, createCotizacion } from './controllers/cotizacionController.js';
import { getNotas, createNota } from './controllers/notaController.js';
import { getIngresos, createIngreso } from './controllers/ingresoController.js';
import { getFacturasRecurrentes, createFacturaRecurrente } from './controllers/facturaRecurrenteController.js';
import { authenticateToken } from './middleware/auth.js';

const router = Router();

// Login y usuario master
router.post('/auth/login', login);
router.get('/usuarios', authenticateToken, getUsuarios);

// Clientes
router.get('/clientes', authenticateToken, getClientes);
router.post('/clientes', authenticateToken, createCliente);

// Facturas
router.get('/facturas', authenticateToken, getFacturas);
router.post('/facturas', authenticateToken, createFactura);

// Gastos
router.get('/gastos', authenticateToken, getGastos);
router.post('/gastos', authenticateToken, createGasto);

// Cotizaciones
router.get('/cotizaciones', authenticateToken, getCotizaciones);
router.post('/cotizaciones', authenticateToken, createCotizacion);

// Notas
router.get('/notas', authenticateToken, getNotas);
router.post('/notas', authenticateToken, createNota);

// Ingresos
router.get('/ingresos', authenticateToken, getIngresos);
router.post('/ingresos', authenticateToken, createIngreso);

// Facturas recurrentes
router.get('/facturas-recurrentes', authenticateToken, getFacturasRecurrentes);
router.post('/facturas-recurrentes', authenticateToken, createFacturaRecurrente);

export default router;
