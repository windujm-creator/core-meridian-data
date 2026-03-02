import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';
import compression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => ({
  server: {
    host: '::',
    port: 8080,
    hmr: { overlay: false },
    headers: {
      'Cross-Origin-Opener-Policy':   'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },

  plugins: [
    react(),
    mode === 'development' && componentTagger(),

    // Brotli compression
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 1024,
    }),

    // Gzip fallback
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
  ].filter(Boolean),

  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },

  // WASM support
  assetsInclude: ['**/*.wasm'],

  worker: {
    format: 'es',
  },

  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // ─── Vendor: React core ───────────────────────────────────────────
          if (id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/react-router-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react';
          }

          // ─── Vendor: Data / Query ─────────────────────────────────────────
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query';
          }

          // ─── Vendor: Animation ────────────────────────────────────────────
          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          // ─── Vendor: 3D (heavy, only Charts) ─────────────────────────────
          if (id.includes('node_modules/three/')) {
            return 'vendor-three';
          }

          // ─── Vendor: Radix UI ─────────────────────────────────────────────
          if (id.includes('@radix-ui/')) {
            return 'vendor-radix';
          }

          // ─── Vendor: Icons ────────────────────────────────────────────────
          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          // ─── Vendor: Utilities ────────────────────────────────────────────
          if (id.includes('clsx') ||
              id.includes('tailwind-merge') ||
              id.includes('class-variance-authority')) {
            return 'vendor-utils';
          }

          // ─── Vendor: Theme ────────────────────────────────────────────────
          if (id.includes('next-themes')) {
            return 'vendor-theme';
          }

          // ─── Per-route page chunks ────────────────────────────────────────
          // Each heavy page gets its own chunk so it's only loaded on demand

          if (id.includes('src/pages/Dashboard'))    return 'page-dashboard';
          if (id.includes('src/pages/Markets'))      return 'page-markets';
          if (id.includes('src/pages/Charts'))       return 'page-charts';
          if (id.includes('src/pages/OrderBook'))    return 'page-orderbook';
          if (id.includes('src/pages/Derivatives'))  return 'page-derivatives';
          if (id.includes('src/pages/Watchlist'))    return 'page-watchlist';
          if (id.includes('src/pages/Defi'))         return 'page-defi';
          if (id.includes('src/pages/OnChain'))      return 'page-onchain';
          if (id.includes('src/pages/Intelligence')) return 'page-intelligence';
          if (id.includes('src/pages/Sentiment'))    return 'page-sentiment';
          if (id.includes('src/pages/Alerts'))       return 'page-alerts';
          if (id.includes('src/pages/Converter'))    return 'page-converter';
          if (id.includes('src/pages/Portfolio'))    return 'page-portfolio';
          if (id.includes('src/pages/Fundamentals')) return 'page-fundamentals';
          if (id.includes('src/pages/Networks'))     return 'page-networks';
          if (id.includes('src/pages/Tokens'))       return 'page-tokens';
          if (id.includes('src/pages/AISignals'))    return 'page-aisignals';
          if (id.includes('src/pages/Security'))     return 'page-security';
          if (id.includes('src/pages/SmartMoney'))   return 'page-smartmoney';
          if (id.includes('src/pages/Portal'))       return 'page-portal';

          // ─── Shared components chunk ──────────────────────────────────────
          if (id.includes('src/components/shared/')) return 'shared-components';
          if (id.includes('src/components/layout/')) return 'layout-components';
          if (id.includes('src/components/tiles/'))  return 'tile-components';

          // ─── Hooks + lib chunk ────────────────────────────────────────────
          if (id.includes('src/hooks/') || id.includes('src/lib/')) {
            return 'app-hooks';
          }
        },
      },
    },
  },

  optimizeDeps: {
    exclude: ['@/workers/marketWorker'],
  },
}));
