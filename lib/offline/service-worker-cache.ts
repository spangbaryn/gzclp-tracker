interface CacheStrategy {
  (request: Request): Promise<Response>
}

interface CacheOptions {
  timeout?: number
}

export class ServiceWorkerCache {
  private static readonly CACHE_VERSION = 'v1'
  private static readonly STATIC_CACHE = `static-${ServiceWorkerCache.CACHE_VERSION}`
  private static readonly RUNTIME_CACHE = `runtime-${ServiceWorkerCache.CACHE_VERSION}`
  private static readonly CRITICAL_ASSETS = [
    '/',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    '/offline.html'
  ]

  async cacheFirst(request: Request): Promise<Response> {
    const cache = await caches.open(ServiceWorkerCache.STATIC_CACHE)
    
    // Check cache first
    const cached = await cache.match(request)
    if (cached) return cached

    // Fetch and cache if not found
    try {
      const response = await fetch(request)
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    } catch (error) {
      // Try cache again as fallback
      const fallback = await caches.match(request)
      if (fallback) return fallback
      throw error
    }
  }

  async networkFirst(request: Request, options: CacheOptions = {}): Promise<Response> {
    const cache = await caches.open(ServiceWorkerCache.RUNTIME_CACHE)
    const timeout = options.timeout || 3000

    try {
      // Try network with timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)
      
      const response = await fetch(request.clone(), {
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (response.ok) {
        // Update cache with fresh response
        cache.put(request, response.clone())
      }
      
      return response
    } catch (error) {
      // Fallback to cache
      const cached = await cache.match(request)
      if (cached) return cached
      throw error
    }
  }

  async staleWhileRevalidate(request: Request): Promise<Response> {
    const cache = await caches.open(ServiceWorkerCache.RUNTIME_CACHE)
    const cached = await cache.match(request)

    // Return cached immediately if available
    if (cached) {
      // Update cache in background
      fetch(request.clone())
        .then(response => {
          if (response.ok) {
            cache.put(request, response)
          }
        })
        .catch(() => {}) // Ignore background fetch errors
      
      return cached
    }

    // No cache, must fetch
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  }

  async cleanExpiredEntries(): Promise<void> {
    const cache = await caches.open(ServiceWorkerCache.RUNTIME_CACHE)
    const keys = await cache.keys()

    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const expireHeader = response.headers.get('sw-cache-expire')
        if (expireHeader && Date.now() > parseInt(expireHeader)) {
          await cache.delete(request)
        }
      }
    }
  }

  async enforceSizeLimit(maxItems: number): Promise<void> {
    const cache = await caches.open(ServiceWorkerCache.RUNTIME_CACHE)
    const keys = await cache.keys()

    if (keys.length <= maxItems) return

    // Get all entries with last accessed time
    const entries = await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request)
        const lastAccessed = response?.headers.get('sw-last-accessed') || '0'
        return { request, lastAccessed: parseInt(lastAccessed) }
      })
    )

    // Sort by last accessed (oldest first)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed)

    // Never delete critical assets
    const nonCritical = entries.filter(entry => 
      !ServiceWorkerCache.CRITICAL_ASSETS.includes(new URL(entry.request.url).pathname)
    )

    // Delete oldest entries
    const toDelete = nonCritical.slice(0, entries.length - maxItems)
    for (const entry of toDelete) {
      await cache.delete(entry.request)
    }
  }

  getStrategyForRoute(url: string): string {
    const pathname = new URL(url, 'http://localhost').pathname

    // Static assets - cache first
    if (pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)) {
      return 'cacheFirst'
    }

    // API routes - network first
    if (pathname.startsWith('/api/')) {
      // Current workout needs to be always fresh
      if (pathname === '/api/current-workout') {
        return 'networkOnly'
      }
      return 'networkFirst'
    }

    // HTML pages - stale while revalidate
    return 'staleWhileRevalidate'
  }

  async getCache(name: string): Promise<Cache> {
    return caches.open(name)
  }

  // Dual-bucket caching helpers
  async cacheStatic(request: Request, response: Response): Promise<void> {
    const cache = await caches.open(ServiceWorkerCache.STATIC_CACHE)
    await cache.put(request, response)
  }

  async cacheRuntime(request: Request, response: Response): Promise<void> {
    const cache = await caches.open(ServiceWorkerCache.RUNTIME_CACHE)
    
    // Add metadata headers
    const headers = new Headers(response.headers)
    headers.set('sw-last-accessed', Date.now().toString())
    
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    })
    
    await cache.put(request, modifiedResponse)
  }

  // Precache critical assets
  async precacheCriticalAssets(): Promise<void> {
    const cache = await caches.open(ServiceWorkerCache.STATIC_CACHE)
    
    await Promise.all(
      ServiceWorkerCache.CRITICAL_ASSETS.map(async (url) => {
        try {
          const response = await fetch(url)
          if (response.ok) {
            await cache.put(url, response)
          }
        } catch (error) {
          console.warn(`Failed to precache ${url}:`, error)
        }
      })
    )
  }

  // Clean old cache versions
  async deleteOldCaches(): Promise<void> {
    const cacheNames = await caches.keys()
    const currentCaches = [
      ServiceWorkerCache.STATIC_CACHE,
      ServiceWorkerCache.RUNTIME_CACHE
    ]

    await Promise.all(
      cacheNames
        .filter(name => !currentCaches.includes(name))
        .map(name => caches.delete(name))
    )
  }
}