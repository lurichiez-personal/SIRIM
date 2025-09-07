import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        host: '0.0.0.0',
        port: 5000,
        strictPort: true,
        allowedHosts: ['8595f11a-3991-44a1-9e1d-5098a58a2842-00-1l9eml90m0tf3.riker.replit.dev', 'localhost', '127.0.0.1', '.replit.dev'],
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false
          }
        }
      },
      preview: {
        host: '0.0.0.0',
        port: 5000,
        strictPort: true
      }
    };
});
