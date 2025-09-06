import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@components': path.resolve(__dirname, './components'),
      '@features': path.resolve(__dirname, './features'),
      '@assets': path.resolve(__dirname, './attached_assets')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0'
  },
  preview: {
    port: 5000,
    host: '0.0.0.0'
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: false, // Reducir tamaño en producción
    minify: 'terser',
    cssMinify: true,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separar React y librerías principales
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // Separar Recharts (librería de gráficos pesada)
          'charts': ['recharts'],
          
          // Separar Zustand y stores
          'state-management': ['zustand'],
          
          // Agrupar features por funcionalidad
          'dashboard-analytics': [
            './components/analytics/AnalyticsWidgets',
            './utils/analyticsCalculations'
          ],
          
          // Agrupar utilidades
          'utilities': [
            './utils/validation',
            './utils/csvExport'
          ],
          
          // Componentes principales
          'ui-components': [
            './components/ui/Button',
            './components/ui/Card',
            './components/ui/Modal',
            './components/ui/Pagination'
          ]
        },
        // Nombrar chunks consistentemente
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId;
          if (facadeModuleId) {
            const name = facadeModuleId.split('/').pop()?.replace(/\.[^.]+$/, '');
            return `chunks/${name}-[hash].js`;
          }
          return 'chunks/[name]-[hash].js';
        },
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.log en producción
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug'],
        unused: true
      },
      mangle: {
        safari10: true
      }
    },
    // Optimización de CSS
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
      'recharts'
    ],
    exclude: [
      // Excluir módulos que no se necesiten inmediatamente
    ]
  },
  // Pre-bundling para dependencies grandes
  define: {
    __DEV__: JSON.stringify(false)
  }
});