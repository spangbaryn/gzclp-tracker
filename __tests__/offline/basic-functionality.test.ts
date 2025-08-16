import { WorkoutCache } from '@/lib/offline/workout-cache'
import { OfflineQueue } from '@/lib/offline/offline-queue'
import { NetworkMonitor } from '@/lib/offline/network-monitor'

// Mock IndexedDB for tests
const mockIDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn()
}
global.indexedDB = mockIDB as any

// Mock fetch
global.fetch = jest.fn()

describe('Basic Offline Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorage.clear()
  })

  describe('WorkoutCache', () => {
    it('should store and retrieve data', async () => {
      const cache = new WorkoutCache()
      
      const testData = { id: 'test-1', name: 'Test Workout' }
      await cache.put('test-key', testData)
      
      const retrieved = await cache.get('test-key')
      expect(retrieved).toEqual(testData)
    })

    it('should handle expiry', async () => {
      const cache = new WorkoutCache()
      
      const testData = { id: 'test-1' }
      const expiry = Date.now() - 1000 // Expired 1 second ago
      
      await cache.put('expired-key', testData, { expiry })
      const retrieved = await cache.get('expired-key')
      
      expect(retrieved).toBeNull()
    })
  })

  describe('OfflineQueue', () => {
    it('should queue items when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false
      })

      const queue = new OfflineQueue()
      
      await queue.add({ type: 'test', data: { value: 1 } })
      const items = await queue.getAll()
      
      expect(items).toHaveLength(1)
      expect(items[0].type).toBe('test')
    })
  })

  describe('NetworkMonitor', () => {
    it('should detect offline state', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: false
      })

      const monitor = new NetworkMonitor()
      const isOnline = await monitor.checkConnectivity()
      
      expect(isOnline).toBe(false)
    })

    it('should verify actual connectivity', async () => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        writable: true,
        value: true
      })

      // Mock fetch to fail
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'))

      const monitor = new NetworkMonitor()
      const isOnline = await monitor.checkConnectivity()
      
      expect(isOnline).toBe(false)
    })
  })
})