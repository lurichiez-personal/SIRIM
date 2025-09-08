const { Router } = require("express");
const router = Router();

// Standard health check
router.get("/", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

// Kubernetes-style liveness probe
router.get("/healthz", async (req, res) => {
  try {
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "sirim-api",
      version: process.env.npm_package_version || "dev",
      uptime: process.uptime()
    };
    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: "unhealthy", 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Kubernetes-style readiness probe with DB check
router.get("/readyz", async (req, res) => {
  try {
    const prisma = req.app.locals.prisma;
    await prisma.$queryRaw`SELECT 1`;
    
    const readiness = {
      status: "ready",
      timestamp: new Date().toISOString(),
      service: "sirim-api",
      database: "connected",
      checks: { database: "ok" }
    };
    res.json(readiness);
  } catch (error) {
    res.status(503).json({ 
      status: "not ready", 
      error: error.message,
      timestamp: new Date().toISOString(),
      database: "disconnected",
      checks: { database: "failed" }
    });
  }
});

// Metrics endpoint
router.get("/metrics", async (req, res) => {
  try {
    const metrics = {
      timestamp: new Date().toISOString(),
      service: "sirim-api",
      process: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu_usage: process.cpuUsage()
      }
    };
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Metrics collection failed", details: error.message });
  }
});

module.exports = router;