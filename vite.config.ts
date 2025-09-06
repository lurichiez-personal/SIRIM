import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        host: '0.0.0.0',
        port: 5000,
        strictPort: true,
        allowedHosts: true,
        hmr: {
          port: 5000,
        },
      },
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor': ['react', 'react-dom'],
              'router': ['react-router-dom'],
              'charts': ['recharts'],
              'utilities': ['zustand', 'jszip', '@google/genai']
            }
          }
        },
        chunkSizeWarningLimit: 600,
        sourcemap: false
      }
    };
});
