# SIRIM - Despliegue en Render

## Configuración automática
Este proyecto incluye `render.yaml` para despliegue automático de:
- **Backend API** (Node.js service)
- **Frontend** (Static site)

## Variables de entorno en Render
El backend necesita:
- `JWT_SECRET` (generado automáticamente)
- `PORT` (configurado en 10000)

El frontend usa:
- `VITE_API_URL` (vinculado automáticamente al backend)

## Pasos para desplegar
1. Conecta tu repo de GitHub a Render
2. Render detectará automáticamente el `render.yaml`
3. Se crearán dos servicios:
   - `sirim-backend` (API web service)
   - `sirim-app` (Static site)

## Base de datos en producción
Por defecto usa SQLite local. Para producción considera:
- PostgreSQL (Render Database)
- Actualizar `db.js` con variables de entorno para DB

## URLs resultantes
- Backend: `https://sirim-backend.onrender.com`
- Frontend: `https://sirim-app.onrender.com`

## Usuario master en producción
- Email: `lurichiez@gmail.com`
- Contraseña: `Alonso260990#`
- Se crea automáticamente al iniciar el backend
