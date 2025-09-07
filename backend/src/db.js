// src/db.js - Configuración robusta de Prisma Client
const { PrismaClient } = require('@prisma/client');

// Configuración robusta del cliente Prisma con pool explícito
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // CRITICAL FIX: Explicit connection pool configuration
  // Development: 10 connections, Production: 20 connections
  connectionLimit: parseInt(process.env.CONNECTION_POOL_SIZE || '10'),
  transactionOptions: {
    isolationLevel: 'ReadCommitted',
    timeout: parseInt(process.env.CONNECTION_TIMEOUT_MS || '20000'),
  },
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event', 
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Event listeners para logging y debugging
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Query: ' + e.query);
    console.log('Params: ' + e.params);
    console.log('Duration: ' + e.duration + 'ms');
  }
});

prisma.$on('error', (e) => {
  console.error('Prisma Error:', e);
});

prisma.$on('warn', (e) => {
  console.warn('Prisma Warning:', e);
});

prisma.$on('info', (e) => {
  console.info('Prisma Info:', e);
});

// Manejo de reconexión automática
let isConnected = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

const connectWithRetry = async () => {
  try {
    await prisma.$connect();
    isConnected = true;
    reconnectAttempts = 0;
    console.log('✅ Prisma client connected successfully');
    return true;
  } catch (error) {
    isConnected = false;
    reconnectAttempts++;
    console.error(`❌ Failed to connect to database (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}):`, error.message);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Exponential backoff, max 10s
      console.log(`⏳ Retrying connection in ${delay}ms...`);
      setTimeout(connectWithRetry, delay);
    } else {
      console.error('🚨 Max reconnection attempts reached. Database connection failed.');
      process.exit(1);
    }
    return false;
  }
};

// Función wrapper para operaciones con retry automático
const executeWithRetry = async (operation, maxRetries = 3) => {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    try {
      if (!isConnected) {
        await connectWithRetry();
      }
      
      return await operation();
    } catch (error) {
      attempts++;
      console.error(`Operation failed (attempt ${attempts}/${maxRetries}):`, error.message);
      
      // Verificar si es un error de conexión
      if (error.code === 'P1017' || error.message.includes('connection') || error.message.includes('closed')) {
        isConnected = false;
        if (attempts < maxRetries) {
          console.log('🔄 Connection lost, attempting to reconnect...');
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
      }
      
      if (attempts >= maxRetries) {
        throw error;
      }
    }
  }
};

// Extender Prisma con retry logic
const prismaWithRetry = new Proxy(prisma, {
  get(target, prop) {
    const originalMethod = target[prop];
    
    if (typeof originalMethod === 'object' && originalMethod !== null) {
      // Para modelos (user, empresa, etc.)
      return new Proxy(originalMethod, {
        get(modelTarget, modelProp) {
          const originalModelMethod = modelTarget[modelProp];
          
          if (typeof originalModelMethod === 'function') {
            return function(...args) {
              return executeWithRetry(() => originalModelMethod.apply(modelTarget, args));
            };
          }
          
          return originalModelMethod;
        }
      });
    }
    
    if (typeof originalMethod === 'function') {
      return function(...args) {
        return executeWithRetry(() => originalMethod.apply(target, args));
      };
    }
    
    return originalMethod;
  }
});

// Conectar al inicializar
connectWithRetry();

// Manejo graceful de cierre
process.on('beforeExit', async () => {
  console.log('🔌 Disconnecting Prisma client...');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  console.log('🔌 Received SIGINT, disconnecting Prisma client...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔌 Received SIGTERM, disconnecting Prisma client...');
  await prisma.$disconnect();
  process.exit(0);
});

module.exports = prismaWithRetry;