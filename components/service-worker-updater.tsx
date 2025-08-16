'use client'

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check for updates
        registration.update()
        
        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              if (confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'skip-waiting' })
                window.location.reload()
              }
            }
          })
        })
      })
    }
  }, [])
  
  return null
}