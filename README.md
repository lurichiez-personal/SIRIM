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
2. Create a `.env.local` file and set your keys:
   - `GEMINI_API_KEY` for Gemini services
   - `VITE_API_URL` pointing to your backend (e.g., `https://your-backend-url.example.com`)
   - `VITE_DGII_API_URL` pointing to a DGII lookup service
3. Type-check the project:
   `npm test`
4. Run the app:
   `npm run dev`

## Deploy to Render

This project includes a `render.yaml` for easy static-site deployment.

1. Push your code to Git.
2. In Render, create a **Static Site** and point it at this repository.
3. Render runs `npm install && npm run build` and serves the `dist` directory.
4. Set the `VITE_API_URL` environment variable in Render to your backend URL.
5. (Optional) Set `VITE_DGII_API_URL` if you use an external DGII lookup service.

After the build finishes, your site will be available at the URL provided by Render.
