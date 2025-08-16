import { WorkoutCache } from './workout-cache'

interface Timer {
  id: string
  workoutId: string
  exerciseId: string
  setId: string
  type: 'rest' | 'amrap'
  duration: number
  startTime: number
  pausedAt?: number
  pausedDuration: number
  onComplete?: (data: any) => void
  reps?: number
}

interface TimerStatus {
  remaining: number
  isRunning: boolean
  type: 'rest' | 'amrap'
  reps?: number
}

export class TimerManager {
  private timers: Map<string, Timer> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()
  private cache: WorkoutCache
  private audioCache: string[] = []

  constructor(cache: WorkoutCache) {
    this.cache = cache
    this.setupVisibilityListener()
    this.restoreAll()
  }

  private setupVisibilityListener() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.handleVisibilityChange('hidden')
      } else {
        this.handleVisibilityChange('visible')
      }
    })
  }

  async startRestTimer(options: {
    workoutId: string
    exerciseId: string
    setId: string
    duration: number
    onComplete?: (data: any) => void
  }): Promise<string> {
    const timer: Timer = {
      id: `timer-${Date.now()}-${Math.random()}`,
      type: 'rest',
      startTime: Date.now(),
      pausedDuration: 0,
      ...options
    }

    this.timers.set(timer.id, timer)
    await this.persistTimer(timer)
    this.startInterval(timer)

    return timer.id
  }

  async startAmrapTimer(options: {
    workoutId: string
    exerciseId: string
    setId: string
    duration: number
  }): Promise<string> {
    const timer: Timer = {
      id: `timer-${Date.now()}-${Math.random()}`,
      type: 'amrap',
      startTime: Date.now(),
      pausedDuration: 0,
      reps: 0,
      ...options
    }

    this.timers.set(timer.id, timer)
    await this.persistTimer(timer)
    this.startInterval(timer)

    return timer.id
  }

  async incrementAmrapReps(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId)
    if (!timer || timer.type !== 'amrap') return

    timer.reps = (timer.reps || 0) + 1
    await this.persistTimer(timer)
  }

  async restoreTimer(timerId: string): Promise<TimerStatus | null> {
    const stored = await this.cache.get(`timer-${timerId}`)
    if (!stored) return null

    const timer = stored as Timer
    const elapsed = Date.now() - timer.startTime - timer.pausedDuration
    const remaining = Math.max(0, timer.duration * 1000 - elapsed)

    if (remaining > 0) {
      this.timers.set(timerId, timer)
      this.startInterval(timer)
      
      return {
        remaining: Math.ceil(remaining / 1000),
        isRunning: !timer.pausedAt,
        type: timer.type,
        reps: timer.reps
      }
    }

    // Timer has expired
    await this.cache.delete(`timer-${timerId}`)
    return null
  }

  async getTimerStatus(timerId: string): Promise<TimerStatus | null> {
    const timer = this.timers.get(timerId)
    if (!timer) return null

    const elapsed = Date.now() - timer.startTime - timer.pausedDuration
    const remaining = Math.max(0, timer.duration * 1000 - elapsed)

    if (remaining === 0) {
      return null
    }

    return {
      remaining: Math.ceil(remaining / 1000),
      isRunning: !timer.pausedAt,
      type: timer.type,
      reps: timer.reps
    }
  }

  async handleVisibilityChange(state: 'hidden' | 'visible'): Promise<void> {
    if (state === 'hidden') {
      // Pause all timers
      for (const timer of this.timers.values()) {
        if (!timer.pausedAt) {
          timer.pausedAt = Date.now()
          await this.persistTimer(timer)
          this.clearInterval(timer.id)
        }
      }
    } else {
      // Resume all timers
      for (const timer of this.timers.values()) {
        if (timer.pausedAt) {
          timer.pausedDuration += Date.now() - timer.pausedAt
          timer.pausedAt = undefined
          await this.persistTimer(timer)
          this.startInterval(timer)
        }
      }
    }
  }

  async persistAll(): Promise<void> {
    for (const timer of this.timers.values()) {
      await this.persistTimer(timer)
    }
  }

  async restoreAll(): Promise<void> {
    // In a real implementation, would scan for all timer keys
    // For now, this is called with specific timer IDs
  }

  cleanup(): void {
    for (const interval of this.intervals.values()) {
      clearInterval(interval)
    }
    this.intervals.clear()
    this.timers.clear()
  }

  async cacheAudioAssets(): Promise<string[]> {
    const audioFiles = [
      '/sounds/timer-complete.mp3',
      '/sounds/timer-warning.mp3'
    ]

    // In a real implementation, would cache these files
    this.audioCache = audioFiles
    return audioFiles
  }

  async testAudioPlayback(): Promise<boolean> {
    try {
      // Test if audio can be played
      const audio = new Audio(this.audioCache[0])
      audio.volume = 0
      await audio.play()
      audio.pause()
      return true
    } catch {
      return false
    }
  }

  async playAudio(file: string): Promise<void> {
    const audio = new Audio(file)
    await audio.play()
  }

  async completeWorkout(workoutId: string): Promise<any> {
    const workout = await this.cache.get('active-workout')
    if (!workout || workout.id !== workoutId) return null

    const completed = {
      ...workout,
      completedAt: new Date(),
      date: workout.date // Preserve original date
    }

    await this.cache.delete('active-workout')
    return completed
  }

  private async persistTimer(timer: Timer): Promise<void> {
    // Don't persist the callback function
    const { onComplete, ...timerData } = timer
    await this.cache.put(`timer-${timer.id}`, timerData)
  }

  private startInterval(timer: Timer): void {
    const interval = setInterval(async () => {
      const elapsed = Date.now() - timer.startTime - timer.pausedDuration
      const remaining = timer.duration * 1000 - elapsed

      if (remaining <= 0) {
        this.clearInterval(timer.id)
        await this.handleTimerComplete(timer)
      }
    }, 100)

    this.intervals.set(timer.id, interval)
  }

  private clearInterval(timerId: string): void {
    const interval = this.intervals.get(timerId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(timerId)
    }
  }

  private async handleTimerComplete(timer: Timer): Promise<void> {
    // Remove from active timers
    this.timers.delete(timer.id)
    await this.cache.delete(`timer-${timer.id}`)

    // Play audio or vibrate
    try {
      await this.playAudio('/sounds/timer-complete.mp3')
    } catch {
      // Fallback to vibration
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    }

    // Call completion callback
    if (timer.onComplete) {
      timer.onComplete({
        timerId: timer.id,
        workoutId: timer.workoutId,
        exerciseId: timer.exerciseId,
        setId: timer.setId
      })
    }
  }
}