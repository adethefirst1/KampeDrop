import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register PWA only in production (avoids blank screens from stale SW in dev)
if (import.meta.env.PROD) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true })
  })
}
