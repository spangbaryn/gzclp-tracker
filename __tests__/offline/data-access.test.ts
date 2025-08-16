import { WorkoutCache } from '@/lib/offline/workout-cache'
import { OfflineQueue } from '@/lib/offline/offline-queue'
import type { Workout, Exercise, Set } from '@prisma/client'

describe('Offline Data Access', () => {
  let cache: WorkoutCache
  let queue: OfflineQueue

  beforeEach(() => {
    // Clear all mocks and caches before each test
    jest.clearAllMocks()
    cache = new WorkoutCache()
    queue = new OfflineQueue()
  })

  describe('WorkoutCache', () => {
    it('should cache workout data when online', async () => {
      const mockWorkout: Workout & { exercises: (Exercise & { sets: Set[] })[] } = {
        id: 'test-workout-1',
        userId: 'test-user',
        workoutType: 'A1',
        completedAt: new Date(),
        exercises: [{
          id: 'ex-1',
          workoutId: 'test-workout-1',
          name: 'Squat',
          tier: 1,
          type: 'squat',
          weight: 135,
          stage: '5×3',
          sets: [{
            id: 'set-1',
            exerciseId: 'ex-1',
            setNumber: 1,
            targetReps: 5,
            completedReps: 5,
            completed: true,
            isAmrap: false
          }]
        }]
      }

      await cache.put('current-workout', mockWorkout)
      const cached = await cache.get('current-workout')

      expect(cached).toEqual(mockWorkout)
    })

    it('should return cached data when offline', async () => {
      const mockWorkout = { id: 'test-1', workoutType: 'B1' }
      await cache.put('current-workout', mockWorkout)

      // Simulate offline
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const cached = await cache.get('current-workout')
      expect(cached).toEqual(mockWorkout)
    })

    it('should expire old cache entries', async () => {
      const mockWorkout = { id: 'old-workout' }
      const expiry = Date.now() - (24 * 60 * 60 * 1000) // 24 hours ago
      
      await cache.put('old-workout', mockWorkout, { expiry })
      const cached = await cache.get('old-workout')

      expect(cached).toBeNull()
    })
  })

  describe('OfflineQueue', () => {
    it('should queue mutations when offline', async () => {
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const mutation = {
        type: 'completeWorkout',
        data: { workoutId: 'test-1', completedAt: new Date() }
      }

      await queue.add(mutation)
      const queued = await queue.getAll()

      expect(queued).toHaveLength(1)
      expect(queued[0]).toMatchObject(mutation)
    })

    it('should process queue when coming back online', async () => {
      // Add items while offline
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      await queue.add({ type: 'completeWorkout', data: { id: '1' } })
      await queue.add({ type: 'updateSet', data: { id: '2' } })

      // Mock the API calls
      const mockProcess = jest.fn().mockResolvedValue({ success: true })
      queue.setProcessor(mockProcess)

      // Come back online
      jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      await queue.processAll()

      expect(mockProcess).toHaveBeenCalledTimes(2)
      const remaining = await queue.getAll()
      expect(remaining).toHaveLength(0)
    })

    it('should retry failed items with exponential backoff', async () => {
      const failingMutation = { type: 'completeWorkout', data: { id: '1' } }
      await queue.add(failingMutation)

      // Mock processor to fail twice then succeed
      let attempts = 0
      const mockProcess = jest.fn().mockImplementation(() => {
        attempts++
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ success: true })
      })
      queue.setProcessor(mockProcess)

      await queue.processAll()

      expect(mockProcess).toHaveBeenCalledTimes(3)
      const remaining = await queue.getAll()
      expect(remaining).toHaveLength(0)
    })

    it('should maintain queue order (FIFO)', async () => {
      const mutations = [
        { type: 'action1', data: { order: 1 } },
        { type: 'action2', data: { order: 2 } },
        { type: 'action3', data: { order: 3 } }
      ]

      for (const mutation of mutations) {
        await queue.add(mutation)
      }

      const processOrder: number[] = []
      const mockProcess = jest.fn().mockImplementation((item) => {
        processOrder.push(item.data.order)
        return Promise.resolve({ success: true })
      })
      queue.setProcessor(mockProcess)

      await queue.processAll()

      expect(processOrder).toEqual([1, 2, 3])
    })
  })

  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', async () => {
      const workout = {
        id: 'workout-1',
        exercises: [{
          id: 'ex-1',
          sets: [
            { id: 'set-1', completed: false, completedReps: 0 }
          ]
        }]
      }

      await cache.put('current-workout', workout)

      // Apply optimistic update
      const optimisticUpdate = {
        path: ['exercises', 0, 'sets', 0],
        changes: { completed: true, completedReps: 5 }
      }

      await cache.applyOptimisticUpdate('current-workout', optimisticUpdate)
      const updated = await cache.get('current-workout')

      expect(updated.exercises[0].sets[0].completed).toBe(true)
      expect(updated.exercises[0].sets[0].completedReps).toBe(5)
    })

    it('should rollback optimistic updates on failure', async () => {
      const original = {
        id: 'workout-1',
        exercises: [{
          sets: [{ completed: false, completedReps: 0 }]
        }]
      }

      await cache.put('current-workout', original)

      // Apply optimistic update
      const updateId = await cache.applyOptimisticUpdate('current-workout', {
        path: ['exercises', 0, 'sets', 0],
        changes: { completed: true, completedReps: 5 }
      })

      // Verify optimistic update applied
      let current = await cache.get('current-workout')
      expect(current.exercises[0].sets[0].completed).toBe(true)

      // Rollback on failure
      await cache.rollbackOptimisticUpdate('current-workout', updateId)
      current = await cache.get('current-workout')

      expect(current.exercises[0].sets[0].completed).toBe(false)
      expect(current.exercises[0].sets[0].completedReps).toBe(0)
    })
  })
})