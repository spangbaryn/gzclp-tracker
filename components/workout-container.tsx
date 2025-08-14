'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { WorkoutView } from './workout-view'
import type { UserSettings, Progression, User } from '@prisma/client'
import type { WorkoutType } from '@/lib/constants'
import { workouts } from '@/lib/constants'

interface WorkoutContainerProps {
  initialWorkoutKey: WorkoutType
  settings: UserSettings
  progressions: Progression[]
  user: User & { settings: UserSettings | null }
}

export function WorkoutContainer({ 
  initialWorkoutKey, 
  settings, 
  progressions,
  user
}: WorkoutContainerProps) {
  const [currentWorkoutKey, setCurrentWorkoutKey] = useState(initialWorkoutKey)
  const router = useRouter()
  const pathname = usePathname()
  
  useEffect(() => {
    // Only check for updates when on the workout page
    if (pathname !== '/') return
    
    // Check for workout updates every 2 seconds
    const checkWorkout = async () => {
      try {
        const response = await fetch('/api/current-workout')
        if (response.ok) {
          const data = await response.json()
          if (data.currentWorkoutKey !== currentWorkoutKey) {
            console.log('Workout changed from', currentWorkoutKey, 'to', data.currentWorkoutKey)
            setCurrentWorkoutKey(data.currentWorkoutKey)
            // Refresh the page data
            router.refresh()
          }
        }
      } catch (error) {
        console.error('Error checking current workout:', error)
      }
    }
    
    // Initial check
    checkWorkout()
    
    // Set up polling
    const interval = setInterval(checkWorkout, 2000)
    
    return () => clearInterval(interval)
  }, [currentWorkoutKey, router, pathname])
  
  const currentWorkout = workouts[currentWorkoutKey]
  
  return (
    <WorkoutView 
      workout={currentWorkout}
      workoutKey={currentWorkoutKey}
      settings={settings}
      progressions={progressions}
      user={user}
    />
  )
}