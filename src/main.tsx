import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Clean up old caches from previous service worker versions
if ('caches' in window) {
  caches.keys().then((names) => {
    for (const name of names) {
      // Delete old workbox/precache caches, keep the new ones
      if (name.includes('precache') || name.includes('workbox')) {
        caches.delete(name)
      }
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
