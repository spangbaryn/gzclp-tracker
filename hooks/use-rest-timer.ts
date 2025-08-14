'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useRestTimer() {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const isRunning = startTime !== null

  // Start the timer
  const startTimer = useCallback((customStartTime?: number) => {
    const newStartTime = customStartTime || Date.now()
    setStartTime(newStartTime)
    // If custom start time is provided, calculate elapsed seconds
    if (customStartTime) {
      const elapsed = Math.floor((Date.now() - customStartTime) / 1000)
      setElapsedSeconds(elapsed)
    } else {
      setElapsedSeconds(0)
    }
  }, [])

  // Stop the timer
  const stopTimer = useCallback(() => {
    setStartTime(null)
    setElapsedSeconds(0)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // Reset the timer (keep running but reset elapsed)
  const resetTimer = useCallback(() => {
    if (isRunning) {
      setStartTime(Date.now())
      setElapsedSeconds(0)
    }
  }, [isRunning])

  // Format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Update elapsed time every second
  useEffect(() => {
    if (startTime) {
      // Calculate initial elapsed time
      const updateElapsed = () => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000)
        setElapsedSeconds(elapsed)
      }

      // Update immediately
      updateElapsed()

      // Then update every second
      intervalRef.current = setInterval(updateElapsed, 1000)

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }
  }, [startTime])

  return {
    startTime,
    elapsedSeconds,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime
  }
}