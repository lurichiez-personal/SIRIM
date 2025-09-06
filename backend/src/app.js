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

const app = express();

// Render/heroku-style proxies
app.set("trust proxy", 1);

// CORS
// Admite un solo origen (string) o varios separados por coma en CORS_ORIGIN
const allowedOrigin = process.env.CORS_ORIGIN || "*";
const origin =
  allowedOrigin === "*"
    ? "*"
    : allowedOrigin.split(",").map((s) => s.trim());

app.use(
  cors({
    origin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
  })
);

// Body parser
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
app.use("/api/modules", modulesRoutes);
app.use("/api/admin", adminRoutes);

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