'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { WorkoutView } from './workout-view'
import { useWorkout } from '@/hooks/use-workout'
import { useOfflineStatus } from '@/hooks/use-offline-status'
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
  const pathname = usePathname()
  const { completeSet } = useWorkout()
  const { isOnline, connectionQuality } = useOfflineStatus()
  
  // Note: The workout polling functionality has been removed as we're using
  // server-side props for the initial workout key. The useWorkout hook is
  // primarily for offline set completion functionality.
  
  const currentWorkout = workouts[currentWorkoutKey]
  
  // Show connection warning for poor networks
  if (connectionQuality === 'poor' && isOnline && pathname === '/') {
    return (
      <>
        <div className="glass rounded-lg p-4 mb-4 border border-orange-500/20">
          <p className="text-sm text-orange-400">
            Poor connection detected. Your workout will be saved offline.
          </p>
        </div>
        <WorkoutView 
          workout={currentWorkout}
          workoutKey={currentWorkoutKey}
          settings={settings}
          progressions={progressions}
          user={user}
          onCompleteSet={completeSet}
        />
      </>
    )
  }
  
  return (
    <WorkoutView 
      workout={currentWorkout}
      workoutKey={currentWorkoutKey}
      settings={settings}
      progressions={progressions}
      user={user}
      onCompleteSet={completeSet}
    />
  )
}