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

/** Serve vendor.html for /vendor*; index.html for other client routes (MPA fallback). */
function htmlShellRewrites(): Plugin {
  function rewrite(req: {
    url?: string
    method?: string
    headers: { accept?: string; 'sec-fetch-dest'?: string }
  }) {
    if (req.method && req.method !== 'GET' && req.method !== 'HEAD') return

    const raw = req.url ?? ''
    const pathOnly = raw.split('?')[0] ?? ''
    const accept = req.headers.accept ?? ''
    // Only real page navigations — never */* (module requests use that and would
    // pipe index.html through vite:import-analysis as JS).
    const isDocumentNav =
      req.headers['sec-fetch-dest'] === 'document' ||
      accept.includes('text/html')
    if (!isDocumentNav) return
    // Leave real assets alone (js/css/png/webmanifest/etc.)
    if (/\.\w+$/.test(pathOnly)) return

    if (
      pathOnly.startsWith('/vendor') &&
      !pathOnly.startsWith('/vendor.html')
    ) {
      // Drop query on the rewritten path — browser URL keeps ?token=… for the client.
      req.url = '/vendor.html'
      return
    }

    // MPA mode has no SPA history fallback — map app/admin/rider/marketing
    // deep links to the customer shell so React Router can handle them.
    if (
      pathOnly !== '/' &&
      pathOnly !== '/index.html' &&
      !pathOnly.startsWith('/vendor')
    ) {
      req.url = '/index.html'
    }
  }

  return {
    name: 'kampedrop-html-shell-rewrites',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req)
        next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        rewrite(req)
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
    htmlShellRewrites(),
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
