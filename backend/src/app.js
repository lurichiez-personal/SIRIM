const express = require("express");
const cors = require("cors");
const { errorHandler } = require("./middleware/error");


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
const allowedOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());


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


app.use(errorHandler);
module.exports = app;