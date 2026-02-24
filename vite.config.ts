
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Intentamos obtener la clave de varias fuentes posibles para asegurar compatibilidad
  const apiKey = process.env.API_KEY || env.API_KEY || process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';
  
  return {
    plugins: [react()],
    base: './',
    define: {
      // Reemplazo global de la variable para que esté disponible en el navegador
      'process.env.API_KEY': JSON.stringify(apiKey)
    },
    server: {
      port: 3000
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    }
  };
});
