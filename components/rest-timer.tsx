'use client'

import { useEffect, useState } from 'react'

interface RestTimerProps {
  startTime: number | null
}

export function RestTimer({ startTime }: RestTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return

    const updateElapsed = () => {
      const seconds = Math.floor((Date.now() - startTime) / 1000)
      setElapsed(seconds)
    }

    // Update immediately
    updateElapsed()

    // Then update every second
    const interval = setInterval(updateElapsed, 1000)

    return () => clearInterval(interval)
  }, [startTime])

  if (!startTime) return null

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const formattedTime = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Determine color based on elapsed time
  const getTimerColor = () => {
    if (elapsed >= 180) return 'text-red-500' // 3 minutes or more
    if (elapsed >= 90) return 'text-green-500' // 1 minute 30 seconds or more
    return 'text-blue-500' // Less than 1 minute 30 seconds (blue)
  }

  const timerColor = getTimerColor()

  return (
    <div className="rest-timer mb-4 text-center">
      <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-black/40 backdrop-blur-sm border-2 border-white/20 shadow-lg">
        <span className="text-sm font-semibold uppercase tracking-wider text-white/80">Rest</span>
        <span className={`text-3xl font-mono font-bold ${timerColor} tabular-nums`}>{formattedTime}</span>
      </div>
    </div>
  )
}