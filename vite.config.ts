
import path from 'path';
// Fix: Added import for fileURLToPath to resolve __dirname in ESM context
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Fix: Define __dirname for ESM environments where it is not globally available
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load environment variables from the current directory.
  // The third parameter '' allows loading all variables regardless of the VITE_ prefix.
  const env = loadEnv(mode, '.', '');

  return {
    base: '/', // ✅ КЛЮЧЕВО: для sparify.org
    server: {
      port: 5173,
      host: '0.0.0.0',
      strictPort: true,
    },
    plugins: [react()],
    define: {
      // Mapping environment variables to process.env for the client-side code.
      // Prioritizes API_KEY if available, falling back to GEMINI_API_KEY.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        // Alias '@' to the project root for cleaner imports.
        '@': path.resolve(__dirname, '.'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
