import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const securityHeaders = helmet();

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por IP
  standardHeaders: true,
  legacyHeaders: false,
});
