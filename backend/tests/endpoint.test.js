import request from 'supertest';
import express from 'express';
import router from '../src/routes.js';
import { createMasterUser } from '../src/controllers/usuarioController.js';

const app = express();
app.use(express.json());
app.use('/api', router);

beforeAll(async () => {
  await createMasterUser();
});

describe('SIRIM Backend Endpoints', () => {
  let token;
  it('Login master user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'lurichiez@sirim.com', password: 'Alonso260990#' });
    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  it('Get usuarios (protegido)', async () => {
    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('Crear y listar cliente', async () => {
    const nuevo = { nombre: 'Cliente Test', rnc: '123456789', empresaId: 1 };
    const res1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send(nuevo);
    expect(res1.statusCode).toBe(200);
    expect(res1.body.id).toBeDefined();
    const res2 = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(res2.statusCode).toBe(200);
    expect(res2.body.some(c => c.nombre === 'Cliente Test')).toBe(true);
  });
});
