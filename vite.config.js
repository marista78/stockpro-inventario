import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 3000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor';
            }
            if (id.includes('recharts')) {
              return 'charts';
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase';
            }
            return 'vendor-others';
          }
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'StockPro — Gestión de Inventario',
        short_name: 'StockPro',
        description: 'Sistema de gestión de inventario para pequeños negocios',
        theme_color: '#4f46e5',
        background_color: '#0d1117',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        screenshots: [
          {
            src: 'screenshots/desktop.png',
            sizes: '1280x800',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: 'screenshots/mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
      },
      workbox: {
        // ✅ Incluye js para que la aplicación cargue offline y no quede en blanco
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5242880,
      },
    })
  ],
})
