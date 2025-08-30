# Optimización y paginación
Todos los endpoints de listados soportan paginación:

`GET /api/clientes?page=1&pageSize=20`
`GET /api/facturas?page=1&pageSize=20`
...etc.

La respuesta incluye:
```
{
  "items": [...],
  "page": 1,
  "pageSize": 20,
  "total": 100,
  "pages": 5
}
```

# Cache
Las consultas frecuentes se cachean automáticamente por 30 segundos para mejorar el rendimiento.

# Guía de despliegue
1. Instala dependencias: `npm install`
2. Configura variables en `.env`
3. Ejecuta en desarrollo: `npm run dev`
4. Para producción: `npm run build` y sirve el contenido de `/dist` con Nginx/Apache
5. El backend puede ejecutarse con `npm start` en el servidor

# Pruebas
Ejecuta `npm test` para validar endpoints y lógica principal.

# Checklist de validación
- [x] Paginación y cache en todos los listados
- [x] Validaciones y seguridad avanzada
- [x] Pruebas automáticas y manuales
- [x] Listo para despliegue en producción
# SIRIM Backend API

## Autenticación

### Login
`POST /api/auth/login`
```json
{
  "email": "lurichiez@sirim.com",
  "password": "Alonso260990#"
}
```
**Respuesta:**
```json
{
  "token": "...JWT...",
  "user": {
    "id": 1,
    "email": "lurichiez@sirim.com",
    "roles": ["master", "admin"],
    "nombre": "Lurichiez"
  }
}
```

## Endpoints protegidos (requieren JWT en `Authorization: Bearer ...`)

- `GET /api/usuarios` — Listar usuarios
- `GET /api/clientes` — Listar clientes
- `POST /api/clientes` — Crear cliente
- `GET /api/facturas` — Listar facturas
- `POST /api/facturas` — Crear factura
- `GET /api/gastos` — Listar gastos
- `POST /api/gastos` — Crear gasto
- `GET /api/cotizaciones` — Listar cotizaciones
- `POST /api/cotizaciones` — Crear cotización
- `GET /api/notas` — Listar notas
- `POST /api/notas` — Crear nota
- `GET /api/ingresos` — Listar ingresos
- `POST /api/ingresos` — Crear ingreso
- `GET /api/facturas-recurrentes` — Listar facturas recurrentes
- `POST /api/facturas-recurrentes` — Crear factura recurrente

## Ejemplo de uso con JWT
```http
GET /api/clientes
Authorization: Bearer <token>
```

## Respuestas y errores
- 401: Token requerido o credenciales incorrectas
- 403: Usuario inactivo o sin permisos
- 500: Error interno

## Pruebas automáticas
Ejecuta `npm test` en la carpeta backend para validar endpoints principales.
