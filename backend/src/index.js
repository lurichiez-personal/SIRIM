


import express from 'express';
import cors from 'cors';
import router from './routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createMasterUser } from './controllers/usuarioController.js';
import { securityHeaders, limiter } from './middleware/security.js';


const app = express();
app.use(cors());
app.use(securityHeaders);
app.use(limiter);
app.use(express.json());

app.get('/', (req, res) => {
  res.send('SIRIM Backend API is running');
});

app.use('/api', router);
app.use(errorHandler);

// Inicializar usuario master al arrancar
createMasterUser();

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`SIRIM backend running on port ${PORT}`);
});
