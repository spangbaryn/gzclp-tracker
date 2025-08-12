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

  return (
    <div className="rest-timer mb-3 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <span className="text-xs uppercase tracking-wider text-muted">Rest Timer</span>
        <span className="text-sm font-mono font-bold text-primary">{formattedTime}</span>
      </div>
    </div>
  )
}