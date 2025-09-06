// start.js - Archivo de inicio para producción
require('dotenv').config();

// Configurar el puerto correctamente para Replit
const PORT = process.env.PORT || 80;

// Configurar variables de entorno necesarias
process.env.NODE_ENV = 'production';
process.env.PORT = PORT;

// Iniciar el servidor
console.log('🚀 Iniciando SIRIM en producción...');
console.log(`📡 Puerto configurado: ${PORT}`);
console.log(`🌍 Modo: ${process.env.NODE_ENV}`);

// Importar y ejecutar el servidor
require('./backend/src/index.js');