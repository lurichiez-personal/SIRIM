// src/app.js
const express = require("express");
const cors = require("cors");
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
    credentials: false,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parser
app.use(express.json({ limit: "1mb" }));

// Ping rápido
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "SIRIM API", ts: new Date().toISOString() });
});

// Mount
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

// 404 por defecto (después de todas las rutas)
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Manejador de errores
app.use(errorHandler);

module.exports = app;
