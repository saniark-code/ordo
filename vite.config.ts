import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // loadEnv checks .env.local first, then .env
    const env = loadEnv(mode, process.cwd(), '');
    // Debug: log if env var is loaded (only in dev, won't expose in production)
    if (mode === 'development') {
      console.log('🔍 Env check:', {
        hasGeminiKey: !!env.GEMINI_API_KEY,
        keyLength: env.GEMINI_API_KEY?.length || 0,
        keyPreview: env.GEMINI_API_KEY ? `${env.GEMINI_API_KEY.substring(0, 10)}...` : 'NOT FOUND',
        hasReplicateToken: !!env.REPLICATE_API_TOKEN,
        replicateTokenLength: env.REPLICATE_API_TOKEN?.length || 0,
        envFiles: 'Note: Vite loads .env.local first, then .env'
      });
    }
    return {
      server: {
        port: 3000,
        host: 'localhost',
        strictPort: false, // Try another port if 3000 is taken
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.REPLICATE_API_TOKEN': JSON.stringify(env.REPLICATE_API_TOKEN || '')
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
