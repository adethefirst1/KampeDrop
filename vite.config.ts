import { resolve } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

function stripToVendorManifest(html: string) {
  let out = html.replace(/<link[^>]*rel=["']manifest["'][^>]*>/gi, '')
  out = out.replace(
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*>/gi,
    '',
  )
  out = out.replace(
    /<\/head>/i,
    [
      '    <link rel="apple-touch-icon" href="/apple-touch-icon-vendor.png" />',
      '    <link rel="manifest" href="/manifest-vendor.webmanifest" />',
      '  </head>',
    ].join('\n'),
  )
  out = out.replace(
    /(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/i,
    '$1KD Vendor$2',
  )
  out = out.replace(/<title>[^<]*<\/title>/i, '<title>KampeDrop Vendor</title>')
  return out
}

/** Serve vendor.html for /vendor* and force vendor-only manifest on that shell. */
function vendorHtmlShell(): Plugin {
  return {
    name: 'kampedrop-vendor-html-shell',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const raw = req.url ?? ''
        const pathOnly = raw.split('?')[0] ?? ''
        const wantsHtml = (req.headers.accept ?? '').includes('text/html')
        if (
          wantsHtml &&
          pathOnly.startsWith('/vendor') &&
          !pathOnly.startsWith('/vendor.html') &&
          !/\.\w+$/.test(pathOnly)
        ) {
          req.url = `/vendor.html${raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''}`
        }
        next()
      })
    },
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = `${ctx.path ?? ''} ${ctx.filename ?? ''}`
        if (!file.includes('vendor.html')) return html
        return stripToVendorManifest(html)
      },
    },
    writeBundle() {
      patchVendorHtmlDist()
    },
    closeBundle() {
      // After vite-plugin-pwa finishes generating the SW / touching HTML.
      patchVendorHtmlDist()
    },
  }
}

function patchVendorHtmlDist() {
  const out = resolve(rootDir, 'dist/vendor.html')
  if (!existsSync(out)) return
  writeFileSync(out, stripToVendorManifest(readFileSync(out, 'utf8')))
}

export default defineConfig({
  appType: 'mpa',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'apple-touch-icon-vendor.png',
        'icons/*.png',
        'manifest-vendor.webmanifest',
      ],
      manifest: {
        name: 'KampeDrop',
        short_name: 'KampeDrop',
        description:
          'From a Badagry home to your door — secured. Trust-first delivery for Badagry.',
        theme_color: '#071f24',
        background_color: '#071f24',
        display: 'standalone',
        orientation: 'portrait-primary',
        // Scope limited to /app so the customer install does not own /vendor on iOS.
        start_url: '/app',
        scope: '/app',
        id: '/app',
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
        // Vendor shell is a separate HTML entry — don't rewrite those to customer index.
        navigateFallbackDenylist: [/^\/vendor/],
        globPatterns: [
          '**/*.{js,css,html,ico,svg,woff2,webmanifest}',
          'icons/*.png',
          'apple-touch-icon.png',
          'apple-touch-icon-vendor.png',
        ],
        globIgnores: ['**/brand/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: {
        enabled: false,
      },
    }),
    // Must run after VitePWA so we can strip the customer manifest it injects.
    vendorHtmlShell(),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        vendor: resolve(rootDir, 'vendor.html'),
      },
    },
  },
})
