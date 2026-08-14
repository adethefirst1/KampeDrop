import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'SureDrop',
        short_name: 'SureDrop',
        description:
          'From a Badagry home to your door — secured. Trust-first delivery for Badagry.',
        theme_color: '#071f24',
        background_color: '#071f24',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/app',
        scope: '/',
        id: '/',
        lang: 'en-NG',
        categories: ['food', 'shopping', 'lifestyle'],
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        // Don't precache large marketing photos — load on demand
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'icons/*.png', 'apple-touch-icon.png'],
        globIgnores: ['**/brand/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
