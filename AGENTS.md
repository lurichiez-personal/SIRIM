# 🛠️ Guía para Desarrolladores - SIRIM

Este archivo contiene instrucciones específicas para trabajar en el Sistema Inteligente de Registros Impositivos (SIRIM).

## 🚀 Configuración del Entorno

1.  **Dependencias:**
    - Usa `npm install` o `bun install` para restaurar los paquetes.
    - Si encuentras problemas de red, intenta limpiar la caché con `npm cache clean --force`.

2.  **Variables de Entorno:**
    - Crea un archivo `.env.local` basado en el siguiente esquema:
      ```env
      VITE_FIREBASE_API_KEY=tu_api_key
      VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
      VITE_FIREBASE_PROJECT_ID=tu_proyecto_id
      VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
      VITE_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
      VITE_FIREBASE_APP_ID=tu_app_id
      VITE_GEMINI_API_KEY=tu_llave_de_gemini
      ```

3.  **Base de Datos (Firebase):**
    - Asegúrate de desplegar las reglas de seguridad:
      ```bash
      firebase deploy --only firestore:rules,storage:rules
      ```

## 🧪 Pruebas

Actualmente, el proyecto utiliza un corredor de pruebas minimalista (`mini-test-runner.cjs`) para validar la lógica crítica de negocio sin depender de una suite pesada en entornos con restricciones de red o de instalación de paquetes.

> [!IMPORTANT]
> **Deuda Técnica:** El `mini-test-runner.cjs` es un **workaround temporal**. Utiliza expresiones regulares para transpilar TypeScript a JavaScript y `eval()` para la ejecución. Una vez que el entorno de desarrollo sea estable y las dependencias (`vitest`) se instalen correctamente, este archivo debe ser eliminado y sustituido por una configuración formal de Vitest.

- **Correr pruebas unitarias (Workaround):**
  ```bash
  npm run test:mini
  ```
- **Pruebas con Vitest (Recomendado):**
  Una vez restauradas las dependencias, utiliza el comando estándar:
  ```bash
  npm test
  ```

### 🌐 Pruebas Full-Stack (Frontend + Backend)

Para probar la integración completa sin tocar datos de producción, utiliza los emuladores de Firebase:

1.  **Instalar Firebase Tools:** `npm install -g firebase-tools`
2.  **Iniciar Emuladores:** `firebase emulators:start` (Inicia Firestore en el puerto 8080).
3.  **Habilitar en el App:**
    En `firebase.ts`, descomenta o añade la lógica de conexión:
    ```typescript
    if (import.meta.env.DEV) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      connectStorageEmulator(storage, 'localhost', 9199);
      connectAuthEmulator(auth, "http://localhost:9099");
    }
    ```
4.  **Correr App:** `npm run dev`

## 🔐 Seguridad y Mejores Prácticas

- **IDs de Acciones:** Siempre utiliza `crypto.randomUUID()` para generar identificadores únicos, especialmente para acciones que se encolan offline.
- **Tipado:** Mantén el tipado estricto en `types.ts` para asegurar la integridad de los datos contables.
- **IA:** Todas las interacciones con Gemini deben ser validadas por el usuario antes de persistir cambios en la base de datos (especialmente en conciliaciones).
