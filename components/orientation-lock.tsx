'use client'

import { useEffect } from 'react'

export function OrientationLock() {
  useEffect(() => {
    // Lock orientation to portrait if API is available
    const lockOrientation = async () => {
      if ('orientation' in screen && 'lock' in screen.orientation) {
        try {
          await (screen.orientation as ScreenOrientation & { lock: (orientation: string) => Promise<void> }).lock('portrait')
          console.log('Orientation locked to portrait')
        } catch (error) {
          console.log('Could not lock orientation:', error)
        }
      }
    }

    lockOrientation()

    // Cleanup - unlock orientation when component unmounts
    return () => {
      if ('orientation' in screen && 'unlock' in screen.orientation) {
        try {
          (screen.orientation as ScreenOrientation & { unlock: () => void }).unlock()
        } catch {
          // Ignore unlock errors
        }
      }
    }
  }, [])

  return null
}