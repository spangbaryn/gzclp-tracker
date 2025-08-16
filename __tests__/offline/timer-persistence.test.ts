import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TimerManager } from '@/lib/offline/timer-manager'
import { WorkoutCache } from '@/lib/offline/workout-cache'

describe('Timer Persistence', () => {
  let timerManager: TimerManager
  let cache: WorkoutCache
  
  beforeEach(() => {
    vi.useFakeTimers()
    cache = new WorkoutCache()
    timerManager = new TimerManager(cache)
  })
  
  afterEach(() => {
    vi.useRealTimers()
    timerManager.cleanup()
  })

  describe('Rest Timer Persistence', () => {
    it('should persist rest timer through reload while offline', async () => {
      // Start 90 second rest timer
      const timerId = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 90
      })
      
      // Advance 30 seconds
      vi.advanceTimersByTime(30000)
      
      // Go offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      // Simulate reload - create new timer manager
      const newTimerManager = new TimerManager(cache)
      const restoredTimer = await newTimerManager.restoreTimer(timerId)
      
      expect(restoredTimer).toBeDefined()
      expect(restoredTimer.remaining).toBe(60)
      expect(restoredTimer.isRunning).toBe(true)
    })

    it('should restore multiple timers after app suspension', async () => {
      // Start multiple timers
      const timer1 = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 90
      })
      
      vi.advanceTimersByTime(10000)
      
      const timer2 = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-2',
        setId: 'set-1',
        duration: 60
      })
      
      // Simulate app suspension
      await timerManager.handleVisibilityChange('hidden')
      
      // Advance time while suspended
      vi.advanceTimersByTime(20000)
      
      // Resume app
      await timerManager.handleVisibilityChange('visible')
      
      const status1 = await timerManager.getTimerStatus(timer1)
      const status2 = await timerManager.getTimerStatus(timer2)
      
      expect(status1.remaining).toBe(60) // 90 - 10 - 20
      expect(status2.remaining).toBe(40) // 60 - 20
    })

    it('should handle timer completion while offline', async () => {
      const onComplete = vi.fn()
      
      const timerId = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 30,
        onComplete
      })
      
      // Go offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      // Timer expires
      vi.advanceTimersByTime(31000)
      
      expect(onComplete).toHaveBeenCalledWith({
        timerId,
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1'
      })
      
      // Timer should be removed from persistence
      const status = await timerManager.getTimerStatus(timerId)
      expect(status).toBeNull()
    })

    it('should persist timer state across PWA kill/restart', async () => {
      const timerId = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 180 // 3 minutes
      })
      
      // Run for 1 minute
      vi.advanceTimersByTime(60000)
      
      // Force persist before "crash"
      await timerManager.persistAll()
      
      // Simulate PWA killed
      timerManager.cleanup()
      
      // User reopens PWA after 30 seconds
      vi.advanceTimersByTime(30000)
      
      // New instance restores state
      const newTimerManager = new TimerManager(cache)
      await newTimerManager.restoreAll()
      
      const status = await newTimerManager.getTimerStatus(timerId)
      expect(status.remaining).toBe(90) // 180 - 60 - 30
    })
  })

  describe('AMRAP Timer Persistence', () => {
    it('should persist AMRAP timer with rep count', async () => {
      const timerId = await timerManager.startAmrapTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-5',
        duration: 300 // 5 minutes
      })
      
      // Do some reps
      await timerManager.incrementAmrapReps(timerId)
      await timerManager.incrementAmrapReps(timerId)
      await timerManager.incrementAmrapReps(timerId)
      
      // Advance 2 minutes
      vi.advanceTimersByTime(120000)
      
      // Reload
      const newTimerManager = new TimerManager(cache)
      const restored = await newTimerManager.restoreTimer(timerId)
      
      expect(restored.type).toBe('amrap')
      expect(restored.reps).toBe(3)
      expect(restored.remaining).toBe(180)
    })
  })

  describe('Timer Audio/Haptic Cues', () => {
    it('should cache audio assets for offline timer completion', async () => {
      const audioCache = await timerManager.cacheAudioAssets()
      
      expect(audioCache).toContain('/sounds/timer-complete.mp3')
      expect(audioCache).toContain('/sounds/timer-warning.mp3')
      
      // Verify assets work offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      const canPlayOffline = await timerManager.testAudioPlayback()
      expect(canPlayOffline).toBe(true)
    })

    it('should fallback to vibration when audio fails', async () => {
      const mockVibrate = vi.fn()
      global.navigator.vibrate = mockVibrate
      
      // Mock audio failure
      vi.spyOn(timerManager, 'playAudio').mockRejectedValue(new Error('Audio failed'))
      
      const timerId = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 1
      })
      
      // Timer completes
      vi.advanceTimersByTime(1100)
      
      expect(mockVibrate).toHaveBeenCalledWith([200, 100, 200])
    })
  })

  describe('Mid-Workout Connectivity Loss', () => {
    it('should handle connectivity loss during active workout', async () => {
      // Start workout online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      
      const workout = {
        id: 'workout-1',
        startTime: new Date(),
        exercises: []
      }
      
      await cache.put('active-workout', workout)
      
      // Start timer
      const timerId = await timerManager.startRestTimer({
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        setId: 'set-1',
        duration: 90
      })
      
      // Go offline mid-timer
      vi.advanceTimersByTime(30000)
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      // Complete a set while offline
      await cache.applyOptimisticUpdate('active-workout', {
        path: ['exercises', 0, 'sets', 0],
        changes: { completed: true, completedReps: 5 }
      })
      
      // Timer continues offline
      vi.advanceTimersByTime(60000)
      
      const timerStatus = await timerManager.getTimerStatus(timerId)
      expect(timerStatus).toBeNull() // Timer completed
      
      const cachedWorkout = await cache.get('active-workout')
      expect(cachedWorkout.exercises[0].sets[0].completed).toBe(true)
    })

    it('should preserve workout duration across offline periods', async () => {
      const startTime = new Date('2024-01-01T10:00:00')
      vi.setSystemTime(startTime)
      
      const workout = {
        id: 'workout-1',
        startTime,
        pausedDuration: 0
      }
      
      await cache.put('active-workout', workout)
      
      // Work out for 10 minutes
      vi.advanceTimersByTime(600000)
      
      // Go offline and app gets suspended
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      await timerManager.handleVisibilityChange('hidden')
      const suspendTime = new Date()
      
      // Phone locked for 5 minutes
      vi.advanceTimersByTime(300000)
      
      // Resume
      await timerManager.handleVisibilityChange('visible')
      const resumeTime = new Date()
      
      // Update paused duration
      const updatedWorkout = await cache.get('active-workout')
      updatedWorkout.pausedDuration += (resumeTime - suspendTime)
      await cache.put('active-workout', updatedWorkout)
      
      // Continue for 5 more minutes
      vi.advanceTimersByTime(300000)
      
      // Total active time should be 15 minutes (10 + 5), not 20
      const finalWorkout = await cache.get('active-workout')
      const totalTime = new Date() - startTime - finalWorkout.pausedDuration
      
      expect(totalTime).toBe(900000) // 15 minutes in ms
    })
  })

  describe('Day Rollover Handling', () => {
    it('should handle workout spanning midnight', async () => {
      // Start at 11:30 PM
      const startTime = new Date('2024-01-01T23:30:00')
      vi.setSystemTime(startTime)
      
      const workout = {
        id: 'workout-1',
        startTime,
        date: '2024-01-01'
      }
      
      await cache.put('active-workout', workout)
      
      // Go offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      // Workout continues past midnight (1 hour)
      vi.advanceTimersByTime(3600000)
      
      // Complete workout at 12:30 AM
      const completed = await timerManager.completeWorkout('workout-1')
      
      // Should maintain original date, not create duplicate
      expect(completed.date).toBe('2024-01-01')
      expect(completed.completedAt).toEqual(new Date('2024-01-02T00:30:00'))
    })
  })
})