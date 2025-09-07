<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/17sCHUjMls3bjgXkCSIdpvjqNsD2xn2kE

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Backend API

An Express backend using PostgreSQL is included under `backend/` to persist facturas.

### Setup

```bash
cd backend
npm install
# configure DATABASE_URL in environment or .env
npm start
```

The server exposes the following endpoints:

- `GET /api/facturas?empresaId=ID` – List facturas, optionally filtered by empresa.
- `POST /api/facturas` – Create a factura. The body should be JSON.
- `GET /api/facturas/:id` – Retrieve a single factura by ID.

data is stored in a PostgreSQL table `facturas`.
