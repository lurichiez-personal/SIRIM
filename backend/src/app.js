// src/app.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const { errorHandler } = require("./middleware/error");

// Rutas
const healthRoutes = require("./routes/health");
const authRoutes = require("./routes/auth");
const empresasRoutes = require("./routes/empresas");
const clientesRoutes = require("./routes/clientes");
const itemsRoutes = require("./routes/items");
const ncfRoutes = require("./routes/ncf");
const facturasRoutes = require("./routes/facturas");
const gastosRoutes = require("./routes/gastos");
const ingresosRoutes = require("./routes/ingresos");
const reportesRoutes = require("./routes/reportes");
const empleadosRoutes = require("./routes/empleados");
const nominaRoutes = require("./routes/nomina");
const asientosRoutes = require("./routes/asientos");
const conciliacionRoutes = require("./routes/conciliacion");
const subscriptionsRoutes = require("./routes/subscriptions");
const paymentsRoutes = require("./routes/payments");
const modulesRoutes = require("./routes/modules");
const adminRoutes = require("./routes/admin");
const metasVentasRoutes = require("./routes/metas-ventas");

const app = express();

// Render/heroku-style proxies
app.set("trust proxy", 1);

// CORS hardened for DEV environment
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://172.31.101.162:5000'
];

// Security hardening
app.disable('x-powered-by'); // Remove Express signature

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (Postman, mobile apps)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked request from: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

// Security headers middleware
app.use((req, res, next) => {
  // CSP for XSS protection
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'");
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');
  
  // MIME sniffing protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  next();
});

// Rate limiting middleware (100 requests per minute)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 100;

app.use((req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, { count: 1, windowStart: now });
  } else {
    const clientData = requestCounts.get(clientId);
    
    if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
      clientData.count = 1;
      clientData.windowStart = now;
    } else {
      clientData.count++;
      
      if (clientData.count > RATE_LIMIT_MAX) {
        return res.status(429).json({ 
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Max ${RATE_LIMIT_MAX} requests per minute.`,
          retryAfter: Math.ceil((clientData.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
        });
      }
    }
  }
  
  next();
});

// Enhanced logging with request ID
app.use((req, res, next) => {
  req.requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  res.setHeader('X-Request-ID', req.requestId);
  console.log(`[${req.requestId}] ${req.method} ${req.path} - ${req.ip} - ${new Date().toISOString()}`);
  next();
});

// Body parser (kept at 1mb for security)
app.use(express.json({ limit: "1mb" }));

// Servir archivos estáticos del frontend SIEMPRE (desarrollo y producción)
app.use(express.static(path.join(__dirname, '../../dist'), {
  setHeaders: (res, path) => {
    // Forzar recarga para CSS y JS
    if (path.endsWith('.css') || path.endsWith('.js')) {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
    }
  }
}));

// API health check en ruta específica
app.get("/api", (_req, res) => {
  res.json({ ok: true, service: "SIRIM API", ts: new Date().toISOString() });
});

// Mount API routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/master", require("./routes/master"));
app.use("/api/registration", require("./routes/registration"));
app.use("/api/empresas", empresasRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/items", itemsRoutes);
app.use("/api/ncf", ncfRoutes);
app.use("/api/facturas", facturasRoutes);
app.use("/api/gastos", gastosRoutes);
app.use("/api/ingresos", ingresosRoutes);
app.use("/api/reportes", reportesRoutes);
app.use("/api/empleados", empleadosRoutes);
app.use("/api/nomina", nominaRoutes);
app.use("/api/asientos", asientosRoutes);
app.use("/api/conciliacion", conciliacionRoutes);
app.use("/api/subscriptions", subscriptionsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/stripe", require("./routes/stripe"));
app.use("/api/modules", modulesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/metas-ventas", metasVentasRoutes);
app.use("/api/email-config", require("./routes/email-config"));
app.use("/api/bulk", require("./routes/bulk"));

// Catch all handler para React Router (SIEMPRE activo)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  }
});

// Manejador de errores
app.use(errorHandler);

module.exports = app;