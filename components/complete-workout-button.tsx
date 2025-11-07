'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompleteModal } from './complete-modal'
import type { ExerciseData } from './workout-view'
import type { WorkoutType } from '@/lib/constants'

interface CompleteWorkoutButtonProps {
  workoutKey: WorkoutType
  exercisesData: ExerciseData[]
  onComplete?: () => void
  onAdvanceWorkout?: () => void
}

export function CompleteWorkoutButton({
  workoutKey,
  exercisesData,
  onComplete,
  onAdvanceWorkout
}: CompleteWorkoutButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [completedSets, setCompletedSets] = useState(0)
  const router = useRouter()

  const handleComplete = async () => {
    // Calculate completed sets
    const totalCompletedSets = exercisesData.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.completed).length, 0
    )
    setCompletedSets(totalCompletedSets)

    // Show modal immediately for good UX
    setShowModal(true)

    // Save workout to database
    try {
      console.log('Sending workout completion request...')
      console.log('Workout key:', workoutKey)
      console.log('Exercises data:', exercisesData)

      const response = await fetch('/api/workouts/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workoutKey,
          exercises: exercisesData
        })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        throw new Error(`Failed to save workout: ${errorText}`)
      }

      // Ensure the response is fully processed
      const result = await response.json()
      console.log('Workout completion result:', result)

      // Only after successful save, clear localStorage and call onComplete
      if (onComplete) {
        onComplete()
      }

      // Refresh server data to get the updated workout
      console.log('Refreshing server data...')
      router.refresh()
    } catch (error) {
      console.error('Error completing workout:', error)
      // Close modal and show error
      setShowModal(false)
      alert('Failed to save workout. Please try again.')
    }
  }

  const handleModalClose = () => {
    setShowModal(false)

    // Advance to next workout
    if (onAdvanceWorkout) {
      onAdvanceWorkout()
    }
  }

  return (
    <>
      <button
        onClick={handleComplete}
        className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-8 mb-4 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
      >
        Complete Workout
      </button>
      
      {showModal && (
        <CompleteModal 
          completedSets={completedSets}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}