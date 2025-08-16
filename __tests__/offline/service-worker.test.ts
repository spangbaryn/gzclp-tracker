import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ServiceWorkerCache } from '@/lib/offline/service-worker-cache'

// Mock service worker environment
global.caches = {
  open: vi.fn(),
  match: vi.fn(),
  delete: vi.fn()
} as any

global.self = {
  addEventListener: vi.fn(),
  skipWaiting: vi.fn(),
  clients: {
    claim: vi.fn()
  }
} as any

describe('Service Worker Caching Strategies', () => {
  let swCache: ServiceWorkerCache
  let mockCache: any

  beforeEach(() => {
    mockCache = {
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn()
    }
    
    vi.mocked(global.caches.open).mockResolvedValue(mockCache)
    swCache = new ServiceWorkerCache()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Cache First Strategy', () => {
    it('should return cached response if available', async () => {
      const mockRequest = new Request('/api/workouts')
      const mockResponse = new Response('cached data')
      
      mockCache.match.mockResolvedValue(mockResponse)

      const response = await swCache.cacheFirst(mockRequest)

      expect(response).toBe(mockResponse)
      expect(mockCache.match).toHaveBeenCalledWith(mockRequest)
    })

    it('should fetch and cache if not in cache', async () => {
      const mockRequest = new Request('/api/workouts')
      const mockResponse = new Response('fresh data')
      
      mockCache.match.mockResolvedValue(undefined)
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      const response = await swCache.cacheFirst(mockRequest)

      expect(response).toBe(mockResponse)
      expect(global.fetch).toHaveBeenCalledWith(mockRequest)
      expect(mockCache.put).toHaveBeenCalledWith(mockRequest, mockResponse)
    })

    it('should return cached version if fetch fails', async () => {
      const mockRequest = new Request('/api/workouts')
      const cachedResponse = new Response('cached data')
      
      mockCache.match
        .mockResolvedValueOnce(undefined) // First check
        .mockResolvedValueOnce(cachedResponse) // After fetch fails
        
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const response = await swCache.cacheFirst(mockRequest)

      expect(response).toBe(cachedResponse)
    })
  })

  describe('Network First Strategy', () => {
    it('should fetch fresh data and update cache', async () => {
      const mockRequest = new Request('/api/workouts')
      const freshResponse = new Response('fresh data')
      
      global.fetch = vi.fn().mockResolvedValue(freshResponse)

      const response = await swCache.networkFirst(mockRequest)

      expect(response).toBe(freshResponse)
      expect(global.fetch).toHaveBeenCalledWith(mockRequest)
      expect(mockCache.put).toHaveBeenCalledWith(mockRequest, freshResponse)
    })

    it('should fallback to cache if network fails', async () => {
      const mockRequest = new Request('/api/workouts')
      const cachedResponse = new Response('cached data')
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
      mockCache.match.mockResolvedValue(cachedResponse)

      const response = await swCache.networkFirst(mockRequest)

      expect(response).toBe(cachedResponse)
      expect(mockCache.match).toHaveBeenCalledWith(mockRequest)
    })

    it('should timeout and use cache for slow networks', async () => {
      const mockRequest = new Request('/api/workouts')
      const cachedResponse = new Response('cached data')
      
      // Simulate slow network
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(new Response('slow')), 5000))
      )
      mockCache.match.mockResolvedValue(cachedResponse)

      const response = await swCache.networkFirst(mockRequest, { timeout: 100 })

      expect(response).toBe(cachedResponse)
    })
  })

  describe('Stale While Revalidate Strategy', () => {
    it('should return cache immediately and update in background', async () => {
      const mockRequest = new Request('/api/workouts')
      const cachedResponse = new Response('cached data')
      const freshResponse = new Response('fresh data')
      
      mockCache.match.mockResolvedValue(cachedResponse)
      global.fetch = vi.fn().mockResolvedValue(freshResponse)

      const response = await swCache.staleWhileRevalidate(mockRequest)

      // Should return cached immediately
      expect(response).toBe(cachedResponse)
      
      // Wait for background update
      await new Promise(resolve => setTimeout(resolve, 0))
      
      expect(global.fetch).toHaveBeenCalledWith(mockRequest)
      expect(mockCache.put).toHaveBeenCalledWith(mockRequest, freshResponse)
    })

    it('should fetch if no cache exists', async () => {
      const mockRequest = new Request('/api/workouts')
      const freshResponse = new Response('fresh data')
      
      mockCache.match.mockResolvedValue(undefined)
      global.fetch = vi.fn().mockResolvedValue(freshResponse)

      const response = await swCache.staleWhileRevalidate(mockRequest)

      expect(response).toBe(freshResponse)
      expect(mockCache.put).toHaveBeenCalledWith(mockRequest, freshResponse)
    })
  })

  describe('Cache Management', () => {
    it('should clean expired entries', async () => {
      const expiredKeys = [
        new Request('/api/old-1'),
        new Request('/api/old-2')
      ]
      
      mockCache.keys.mockResolvedValue(expiredKeys)
      
      // Mock response with expired headers
      const expiredResponse = new Response('', {
        headers: { 'sw-cache-expire': (Date.now() - 1000).toString() }
      })
      mockCache.match.mockResolvedValue(expiredResponse)

      await swCache.cleanExpiredEntries()

      expect(mockCache.delete).toHaveBeenCalledTimes(2)
      expect(mockCache.delete).toHaveBeenCalledWith(expiredKeys[0])
      expect(mockCache.delete).toHaveBeenCalledWith(expiredKeys[1])
    })

    it('should respect cache size limits with LRU eviction', async () => {
      const requests = Array.from({ length: 55 }, (_, i) => 
        new Request(`/api/workout-${i}`)
      )
      
      // Mock responses with last-accessed timestamps
      const responses = requests.map((_, i) => ({
        url: `/api/workout-${i}`,
        lastAccessed: Date.now() - (i * 1000) // Older items have lower timestamps
      }))
      
      mockCache.keys.mockResolvedValue(requests)
      mockCache.match.mockImplementation((req) => {
        const idx = requests.findIndex(r => r.url === req.url)
        return Promise.resolve(new Response('', {
          headers: { 'sw-last-accessed': responses[idx].lastAccessed.toString() }
        }))
      })

      await swCache.enforceSizeLimit(50)

      // Should delete 5 oldest (highest index) entries
      expect(mockCache.delete).toHaveBeenCalledTimes(5)
      expect(mockCache.delete).toHaveBeenCalledWith(requests[50])
      expect(mockCache.delete).toHaveBeenCalledWith(requests[54])
    })

    it('should never evict critical assets', async () => {
      const criticalAssets = [
        '/',
        '/manifest.json',
        '/icon-192.png',
        '/icon-512.png',
        '/offline.html'
      ]
      
      const allRequests = [
        ...criticalAssets.map(url => new Request(url)),
        ...Array.from({ length: 50 }, (_, i) => new Request(`/api/data-${i}`))
      ]
      
      mockCache.keys.mockResolvedValue(allRequests)

      await swCache.enforceSizeLimit(10)

      // Should delete non-critical assets only
      const deleteCalls = mockCache.delete.mock.calls.map(call => call[0].url)
      
      // Critical assets should not be in delete calls
      criticalAssets.forEach(asset => {
        expect(deleteCalls).not.toContain(asset)
      })
      
      // Should have deleted 45 items (55 total - 10 limit = 45, but 5 are critical)
      expect(mockCache.delete).toHaveBeenCalledTimes(45)
    })

    it('should use dual-bucket caching strategy', async () => {
      // Static immutable cache
      const staticCache = await swCache.getCache('static-v1')
      const runtimeCache = await swCache.getCache('runtime')
      
      // Static assets go to static cache
      const staticReq = new Request('/js/app.js')
      await swCache.cacheFirst(staticReq)
      expect(staticCache.put).toHaveBeenCalledWith(staticReq, expect.any(Response))
      
      // API responses go to runtime cache
      const apiReq = new Request('/api/workouts')
      await swCache.networkFirst(apiReq)
      expect(runtimeCache.put).toHaveBeenCalledWith(apiReq, expect.any(Response))
      
      // Only runtime cache should be size-limited
      await swCache.enforceSizeLimit(50)
      expect(runtimeCache.keys).toHaveBeenCalled()
      expect(staticCache.keys).not.toHaveBeenCalled()
    })
  })

  describe('Route Matching', () => {
    it('should apply correct strategy based on route', () => {
      const strategies = swCache.getStrategyForRoute('/api/workouts')
      expect(strategies).toBe('networkFirst')

      const staticStrategy = swCache.getStrategyForRoute('/static/image.png')
      expect(staticStrategy).toBe('cacheFirst')

      const realtimeStrategy = swCache.getStrategyForRoute('/api/current-workout')
      expect(realtimeStrategy).toBe('networkOnly')
    })

    it('should handle pattern matching for dynamic routes', () => {
      const workoutStrategy = swCache.getStrategyForRoute('/api/workouts/123')
      expect(workoutStrategy).toBe('networkFirst')

      const userStrategy = swCache.getStrategyForRoute('/api/users/abc/settings')
      expect(userStrategy).toBe('staleWhileRevalidate')
    })
  })
})