import { describe, it, expect, beforeEach, vi } from 'vitest'
import { OfflineCapabilities } from '@/lib/offline/capabilities'
import { OfflineQueue } from '@/lib/offline/offline-queue'

describe('Offline Capability Detection', () => {
  let capabilities: OfflineCapabilities

  beforeEach(() => {
    vi.clearAllMocks()
    capabilities = new OfflineCapabilities()
  })

  describe('Service Worker Support', () => {
    it('should detect when service worker is not available', () => {
      // Simulate iOS Safari private mode
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })

      const support = capabilities.hasServiceWorkerSupport()
      expect(support).toBe(false)
    })

    it('should provide fallback when service worker is disabled', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })

      const queue = new OfflineQueue()
      
      // Should still queue mutations using localStorage fallback
      await queue.add({ type: 'test', data: {} })
      const queued = await queue.getAll()
      
      expect(queued).toHaveLength(1)
    })

    it('should gracefully handle service worker registration failure', async () => {
      const mockServiceWorker = {
        register: vi.fn().mockRejectedValue(new Error('Registration blocked'))
      }
      
      Object.defineProperty(navigator, 'serviceWorker', {
        value: mockServiceWorker,
        configurable: true
      })

      const registered = await capabilities.registerServiceWorker()
      
      expect(registered).toBe(false)
      expect(capabilities.getFallbackStrategy()).toBe('localStorage')
    })
  })

  describe('Background Sync Support', () => {
    it('should detect when SyncManager is not available', () => {
      // Remove SyncManager (iOS Safari)
      delete (window as any).SyncManager

      const support = capabilities.hasBackgroundSyncSupport()
      expect(support).toBe(false)
    })

    it('should use foreground sync when background sync unavailable', async () => {
      delete (window as any).SyncManager

      const queue = new OfflineQueue()
      const mockProcessor = vi.fn().mockResolvedValue({ success: true })
      queue.setProcessor(mockProcessor)

      // Add item while offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      await queue.add({ type: 'test', data: {} })

      // Come online - should trigger foreground sync
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      window.dispatchEvent(new Event('online'))

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockProcessor).toHaveBeenCalled()
    })

    it('should handle sync registration failure gracefully', async () => {
      const mockRegistration = {
        sync: {
          register: vi.fn().mockRejectedValue(new Error('Sync not allowed'))
        }
      }

      global.navigator.serviceWorker = {
        ready: Promise.resolve(mockRegistration)
      } as any

      const queue = new OfflineQueue()
      
      // Should not throw, should fallback to online event
      await expect(queue.add({ type: 'test', data: {} })).resolves.not.toThrow()
    })
  })

  describe('IndexedDB Support', () => {
    it('should detect when IndexedDB is not available', () => {
      const originalIDB = global.indexedDB
      delete (global as any).indexedDB

      const support = capabilities.hasIndexedDBSupport()
      expect(support).toBe(false)

      // Restore
      global.indexedDB = originalIDB
    })

    it('should fallback to localStorage when IndexedDB unavailable', async () => {
      const originalIDB = global.indexedDB
      delete (global as any).indexedDB

      const queue = new OfflineQueue()
      await queue.add({ type: 'test', data: { value: 'data' } })

      // Check localStorage was used
      const stored = localStorage.getItem('offline-queue')
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored!)
      expect(parsed).toHaveLength(1)

      // Restore
      global.indexedDB = originalIDB
    })

    it('should handle IndexedDB quota exceeded', async () => {
      const mockIDB = {
        open: vi.fn().mockRejectedValue(new DOMException('QuotaExceededError'))
      }
      
      global.indexedDB = mockIDB as any

      const cache = await capabilities.getStorageStrategy()
      
      expect(cache.type).toBe('memory')
      expect(cache.persistent).toBe(false)
    })
  })

  describe('Notification Support', () => {
    it('should detect notification permission state', async () => {
      // Mock denied
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true
      })

      const canNotify = await capabilities.canShowNotifications()
      expect(canNotify).toBe(false)
    })

    it('should fallback to in-app alerts when notifications denied', async () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true
      })

      const alertStrategy = capabilities.getAlertStrategy()
      expect(alertStrategy).toBe('in-app')
    })
  })

  describe('Storage Persistence', () => {
    it('should request persistent storage when available', async () => {
      const mockPersist = vi.fn().mockResolvedValue(true)
      
      if (navigator.storage) {
        navigator.storage.persist = mockPersist
      } else {
        Object.defineProperty(navigator, 'storage', {
          value: { persist: mockPersist },
          configurable: true
        })
      }

      const granted = await capabilities.requestPersistentStorage()
      
      expect(mockPersist).toHaveBeenCalled()
      expect(granted).toBe(true)
    })

    it('should handle storage persistence denial', async () => {
      const mockPersist = vi.fn().mockResolvedValue(false)
      
      Object.defineProperty(navigator, 'storage', {
        value: { persist: mockPersist },
        configurable: true
      })

      const granted = await capabilities.requestPersistentStorage()
      
      expect(granted).toBe(false)
      expect(capabilities.getStorageWarning()).toContain('may be cleared')
    })
  })

  describe('Multi-Environment Fallback Chain', () => {
    it('should provide appropriate fallbacks for iOS Safari', () => {
      // Simulate iOS Safari environment
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true
      })
      delete (window as any).SyncManager
      Object.defineProperty(window, 'safari', {
        value: {},
        configurable: true
      })

      const strategy = capabilities.getOptimalStrategy()
      
      expect(strategy).toEqual({
        cache: 'localStorage',
        sync: 'online-event',
        persist: 'session',
        notifications: 'in-app'
      })
    })

    it('should provide optimal strategy for modern Chrome', () => {
      // Simulate modern Chrome
      Object.defineProperty(navigator, 'serviceWorker', {
        value: { register: vi.fn() },
        configurable: true
      })
      window.SyncManager = vi.fn() as any
      global.indexedDB = { open: vi.fn() } as any

      const strategy = capabilities.getOptimalStrategy()
      
      expect(strategy).toEqual({
        cache: 'indexeddb',
        sync: 'background-sync',
        persist: 'persistent',
        notifications: 'push'
      })
    })
  })

  describe('Capability Change Detection', () => {
    it('should detect when user enables notifications', async () => {
      const onChange = vi.fn()
      capabilities.onCapabilityChange(onChange)

      // Start with denied
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        configurable: true
      })

      // User grants permission
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        configurable: true
      })
      
      await capabilities.checkCapabilityChanges()

      expect(onChange).toHaveBeenCalledWith({
        capability: 'notifications',
        available: true
      })
    })
  })
})