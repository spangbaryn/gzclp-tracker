import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { BackgroundSyncManager } from '@/lib/offline/background-sync'
import type { SyncEvent } from '@/types/offline'

// Mock service worker registration
const mockRegistration = {
  sync: {
    register: vi.fn(),
    getTags: vi.fn()
  }
} as any

global.navigator.serviceWorker = {
  ready: Promise.resolve(mockRegistration),
  controller: {} as any
} as any

// Mock IndexedDB for queue storage
const mockIDB = {
  open: vi.fn(),
  delete: vi.fn()
}

global.indexedDB = mockIDB as any

describe('Background Sync Queue', () => {
  let syncManager: BackgroundSyncManager

  beforeEach(() => {
    vi.clearAllMocks()
    syncManager = new BackgroundSyncManager()
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Sync Registration', () => {
    it('should register sync event when offline', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const syncData = {
        type: 'workout-complete',
        data: { workoutId: 'workout-1', completedAt: new Date() }
      }

      await syncManager.register(syncData)

      expect(mockRegistration.sync.register).toHaveBeenCalledWith('workout-sync')
    })

    it('should process immediately when online', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      
      const mockProcessor = vi.fn().mockResolvedValue({ success: true })
      syncManager.setProcessor(mockProcessor)

      const syncData = {
        type: 'workout-complete',
        data: { workoutId: 'workout-1' }
      }

      await syncManager.register(syncData)

      expect(mockProcessor).toHaveBeenCalledWith(syncData)
      expect(mockRegistration.sync.register).not.toHaveBeenCalled()
    })

    it('should handle failed sync registration gracefully', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      mockRegistration.sync.register.mockRejectedValue(new Error('Not supported'))

      const syncData = { type: 'test', data: {} }
      
      // Should not throw
      await expect(syncManager.register(syncData)).resolves.not.toThrow()
      
      // Should still queue the data
      const queued = await syncManager.getQueuedItems()
      expect(queued).toHaveLength(1)
    })
  })

  describe('Queue Management', () => {
    it('should persist queue to IndexedDB', async () => {
      const mockDB = {
        transaction: vi.fn().mockReturnValue({
          objectStore: vi.fn().mockReturnValue({
            add: vi.fn(),
            getAll: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn()
          })
        })
      }
      
      mockIDB.open.mockResolvedValue(mockDB)

      await syncManager.addToQueue({
        type: 'workout-complete',
        data: { workoutId: 'test-1' }
      })

      expect(mockDB.transaction).toHaveBeenCalledWith(['sync-queue'], 'readwrite')
    })

    it('should maintain queue order (FIFO)', async () => {
      const items = [
        { type: 'action1', data: { order: 1 } },
        { type: 'action2', data: { order: 2 } },
        { type: 'action3', data: { order: 3 } }
      ]

      for (const item of items) {
        await syncManager.addToQueue(item)
      }

      const queued = await syncManager.getQueuedItems()
      expect(queued.map(item => item.data.order)).toEqual([1, 2, 3])
    })

    it('should remove items after successful sync', async () => {
      const mockProcessor = vi.fn().mockResolvedValue({ success: true })
      syncManager.setProcessor(mockProcessor)

      await syncManager.addToQueue({ type: 'test', data: {} })
      await syncManager.processQueue()

      const remaining = await syncManager.getQueuedItems()
      expect(remaining).toHaveLength(0)
    })

    it('should keep items after failed sync', async () => {
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Network error'))
      syncManager.setProcessor(mockProcessor)

      await syncManager.addToQueue({ type: 'test', data: {} })
      await syncManager.processQueue()

      const remaining = await syncManager.getQueuedItems()
      expect(remaining).toHaveLength(1)
    })
  })

  describe('Retry Logic', () => {
    it('should retry with exponential backoff and jitter', async () => {
      vi.useFakeTimers()
      
      let attempts = 0
      const mockProcessor = vi.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ success: true })
      })
      
      syncManager.setProcessor(mockProcessor)

      const item = { type: 'test', data: {} }
      await syncManager.addToQueue(item)

      // Track retry delays
      const retryDelays: number[] = []
      syncManager.on('retryScheduled', (delay: number) => {
        retryDelays.push(delay)
      })

      // First attempt
      await syncManager.processQueue()
      expect(mockProcessor).toHaveBeenCalledTimes(1)

      // First retry - base delay 1000ms + jitter (0-500ms)
      await vi.advanceTimersByTimeAsync(1500)
      expect(mockProcessor).toHaveBeenCalledTimes(2)
      expect(retryDelays[0]).toBeGreaterThanOrEqual(1000)
      expect(retryDelays[0]).toBeLessThanOrEqual(1500)

      // Second retry - base delay 2000ms + jitter (0-1000ms)
      await vi.advanceTimersByTimeAsync(3000)
      expect(mockProcessor).toHaveBeenCalledTimes(3)
      expect(retryDelays[1]).toBeGreaterThanOrEqual(2000)
      expect(retryDelays[1]).toBeLessThanOrEqual(3000)

      // Verify jitter is actually random (not always max)
      const hasVariance = retryDelays.some(delay => 
        delay !== Math.floor(delay / 1000) * 1000
      )
      expect(hasVariance).toBe(true)

      // Should succeed on third attempt
      const remaining = await syncManager.getQueuedItems()
      expect(remaining).toHaveLength(0)

      vi.useRealTimers()
    })

    it('should prevent thundering herd with distributed jitter', async () => {
      vi.useFakeTimers()
      
      // Simulate multiple clients coming online simultaneously
      const managers = Array.from({ length: 10 }, () => new BackgroundSyncManager())
      const retryTimes: number[] = []
      
      // All fail initially
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Server overloaded'))
      
      for (const manager of managers) {
        manager.setProcessor(mockProcessor)
        manager.on('retryScheduled', (delay: number) => retryTimes.push(delay))
        await manager.addToQueue({ type: 'test', data: {} })
        await manager.processQueue()
      }

      // Check that retry times are spread out
      retryTimes.sort((a, b) => a - b)
      
      // No two retries should be at exactly the same time
      const uniqueTimes = new Set(retryTimes)
      expect(uniqueTimes.size).toBe(retryTimes.length)
      
      // Should span reasonable range (not all bunched up)
      const spread = retryTimes[retryTimes.length - 1] - retryTimes[0]
      expect(spread).toBeGreaterThan(400) // At least 400ms spread

      vi.useRealTimers()
    })

    it('should stop retrying after max attempts', async () => {
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Network error'))
      syncManager.setProcessor(mockProcessor)

      const item = { type: 'test', data: {}, maxRetries: 3 }
      await syncManager.addToQueue(item)

      // Process multiple times
      for (let i = 0; i < 5; i++) {
        await syncManager.processQueue()
      }

      // Should only try 3 times
      expect(mockProcessor).toHaveBeenCalledTimes(3)
      
      // Item should be moved to failed queue
      const failed = await syncManager.getFailedItems()
      expect(failed).toHaveLength(1)
    })

    it('should notify user when items permanently fail', async () => {
      const onPermanentFailure = vi.fn()
      syncManager.on('permanentFailure', onPermanentFailure)
      
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Server error'))
      syncManager.setProcessor(mockProcessor)

      const item = { 
        type: 'workout-complete', 
        data: { workoutId: 'workout-1' }, 
        maxRetries: 2 
      }
      
      await syncManager.addToQueue(item)

      // Exhaust retries
      for (let i = 0; i < 3; i++) {
        await syncManager.processQueue()
      }

      expect(onPermanentFailure).toHaveBeenCalledWith({
        item,
        error: expect.any(Error),
        attempts: 2,
        userAction: expect.objectContaining({
          title: 'Sync Failed',
          message: expect.stringContaining('workout'),
          actions: ['retry', 'dismiss']
        })
      })
    })
  })

  describe('Service Worker Sync Event', () => {
    it('should process queue on sync event', async () => {
      const mockProcessor = vi.fn().mockResolvedValue({ success: true })
      syncManager.setProcessor(mockProcessor)

      // Add items to queue
      await syncManager.addToQueue({ type: 'test1', data: {} })
      await syncManager.addToQueue({ type: 'test2', data: {} })

      // Simulate sync event
      const syncEvent = new Event('sync') as SyncEvent
      syncEvent.tag = 'workout-sync'
      syncEvent.waitUntil = vi.fn()

      await syncManager.handleSyncEvent(syncEvent)

      expect(mockProcessor).toHaveBeenCalledTimes(2)
      expect(syncEvent.waitUntil).toHaveBeenCalled()
    })

    it('should handle sync event errors gracefully', async () => {
      const mockProcessor = vi.fn().mockRejectedValue(new Error('Sync failed'))
      syncManager.setProcessor(mockProcessor)

      await syncManager.addToQueue({ type: 'test', data: {} })

      const syncEvent = new Event('sync') as SyncEvent
      syncEvent.tag = 'workout-sync'
      syncEvent.waitUntil = vi.fn()

      // Should not throw
      await expect(syncManager.handleSyncEvent(syncEvent)).resolves.not.toThrow()
      
      // Items should remain in queue
      const remaining = await syncManager.getQueuedItems()
      expect(remaining).toHaveLength(1)
    })
  })

  describe('Workout-specific sync scenarios', () => {
    it('should handle workout completion sync', async () => {
      const workoutData = {
        workoutId: 'workout-1',
        completedAt: new Date(),
        exercises: [
          {
            exerciseId: 'ex-1',
            sets: [
              { setId: 'set-1', completedReps: 5 },
              { setId: 'set-2', completedReps: 5 }
            ]
          }
        ]
      }

      await syncManager.syncWorkoutCompletion(workoutData)

      const queued = await syncManager.getQueuedItems()
      expect(queued[0]).toMatchObject({
        type: 'workout-complete',
        data: workoutData,
        priority: 'high'
      })
    })

    it('should batch set updates for efficiency', async () => {
      const setUpdates = [
        { setId: 'set-1', completedReps: 5 },
        { setId: 'set-2', completedReps: 5 },
        { setId: 'set-3', completedReps: 4 }
      ]

      // Add individual updates
      for (const update of setUpdates) {
        await syncManager.syncSetUpdate(update)
      }

      // Should batch them
      await syncManager.batchPendingUpdates()

      const queued = await syncManager.getQueuedItems()
      expect(queued).toHaveLength(1)
      expect(queued[0].type).toBe('batch-set-updates')
      expect(queued[0].data.updates).toHaveLength(3)
    })

    it('should prioritize workout completion over individual updates', async () => {
      // Add low priority update
      await syncManager.addToQueue({
        type: 'set-update',
        data: { setId: 'set-1' },
        priority: 'low'
      })

      // Add high priority workout completion
      await syncManager.addToQueue({
        type: 'workout-complete',
        data: { workoutId: 'workout-1' },
        priority: 'high'
      })

      const processOrder: string[] = []
      const mockProcessor = vi.fn().mockImplementation((item) => {
        processOrder.push(item.type)
        return Promise.resolve({ success: true })
      })
      
      syncManager.setProcessor(mockProcessor)
      await syncManager.processQueue()

      expect(processOrder).toEqual(['workout-complete', 'set-update'])
    })
  })
})