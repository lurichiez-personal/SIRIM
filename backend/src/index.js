// src/index.js
require("dotenv").config();
const app = require("./app");
const prisma = require("./db");

const PORT = Number(process.env.PORT) || (process.env.NODE_ENV === 'production' ? 80 : 3001);

let server;

async function bootstrap() {
  try {
    // Conecta Prisma antes de levantar el server (evita 502 si la DB no responde)
    await prisma.$connect();
    app.locals.prisma = prisma;

    server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`SIRIM API escuchando en 0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error("Error al iniciar servidor:", err);
    process.exit(1);
  }
}

// Cierre ordenado
async function shutdown(signal) {
  try {
    console.log(`${signal} recibido. Cerrando servidor...`);
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
    console.log("Recursos liberados. Bye!");
    process.exit(0);
  } catch (err) {
    console.error("Error durante el cierre:", err);
    process.exit(1);
  }
}

// Trampas de errores globales (loggea y decide si terminar)
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // En prod podrías process.exit(1) si deseas reinicio del contenedor
});

// Señales de apagado (Render/K8s)
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

bootstrap();
