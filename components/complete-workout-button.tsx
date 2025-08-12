'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CompleteModal } from './complete-modal'
import type { ExerciseData } from './workout-view'
import type { Progression } from '@prisma/client'
import type { WorkoutType } from '@/lib/constants'

interface CompleteWorkoutButtonProps {
  workoutKey: WorkoutType
  exercisesData: ExerciseData[]
  progressions: Progression[]
}

export function CompleteWorkoutButton({ 
  workoutKey, 
  exercisesData,
  progressions 
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

    // Save workout to database
    await fetch('/api/workouts/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workoutKey,
        exercises: exercisesData,
        progressions
      })
    })

    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={handleComplete}
        className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-8 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
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