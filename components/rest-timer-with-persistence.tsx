'use client'

import { useEffect, useState, useRef } from 'react'
import { TimerManager } from '@/lib/offline/timer-manager'
import { WorkoutCache } from '@/lib/offline/workout-cache'

interface RestTimerWithPersistenceProps {
  workoutId: string
  exerciseId: string
  setId: string
  duration: number
  onComplete?: () => void
  onDismiss?: () => void
}

export function RestTimerWithPersistence({ 
  workoutId,
  exerciseId,
  setId,
  duration,
  onComplete,
  onDismiss 
}: RestTimerWithPersistenceProps) {
  const [timerId, setTimerId] = useState<string>()
  const [remaining, setRemaining] = useState(duration)
  const [isActive, setIsActive] = useState(false)
  const timerManagerRef = useRef<TimerManager | null>(null)

  useEffect(() => {
    // Initialize timer manager
    const cache = new WorkoutCache()
    timerManagerRef.current = new TimerManager(cache)
    
    // Start timer
    const startTimer = async () => {
      const id = await timerManagerRef.current!.startRestTimer({
        workoutId,
        exerciseId,
        setId,
        duration,
        onComplete
      })
      setTimerId(id)
      setIsActive(true)
    }
    
    startTimer()
    
    return () => {
      // Cleanup handled automatically by TimerManager
    }
  }, [workoutId, exerciseId, setId, duration, onComplete])

  useEffect(() => {
    if (!isActive || !timerId) return

    const updateRemaining = async () => {
      if (timerManagerRef.current && timerId) {
        const timer = await timerManagerRef.current.getActiveTimer(timerId)
        if (timer) {
          const elapsed = Date.now() - timer.startTime
          const remainingMs = Math.max(0, timer.duration * 1000 - elapsed)
          setRemaining(Math.ceil(remainingMs / 1000))
          
          if (remainingMs <= 0) {
            setIsActive(false)
            if (onComplete) onComplete()
          }
        }
      }
    }

    // Update immediately
    updateRemaining()

    // Then update every second
    const interval = setInterval(updateRemaining, 1000)

    return () => clearInterval(interval)
  }, [isActive, timerId, onComplete])

  const handleDismiss = async () => {
    if (timerManagerRef.current && timerId) {
      await timerManagerRef.current.cancelTimer(timerId)
    }
    setIsActive(false)
    if (onDismiss) onDismiss()
  }

  if (!isActive) return null

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Determine color based on remaining time
  const getTimerColor = () => {
    const elapsed = duration - remaining
    if (elapsed >= 180) return 'text-red-500' // 3 minutes or more
    if (elapsed >= 90) return 'text-green-500' // 1.5 minutes or more
    return 'text-blue-500' // Less than 1.5 minutes
  }

  const timerColor = getTimerColor()

  return (
    <div className="rest-timer mb-4 text-center">
      <div 
        onClick={handleDismiss}
        className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-sm border-2 border-white/20 shadow-lg cursor-pointer active:scale-95 transition-transform"
      >
        <span className="text-sm font-semibold uppercase tracking-wider text-white/80">Rest</span>
        <span className={`text-3xl font-mono font-bold ${timerColor} tabular-nums`}>{formattedTime}</span>
      </div>
      <p className="text-xs text-muted mt-2">Timer persists across app reload</p>
    </div>
  )
}