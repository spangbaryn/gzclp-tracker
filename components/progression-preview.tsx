'use client'

import { calculateNextWorkout } from '@/lib/progression-calculator'
import type { ExerciseData } from './workout-view'

interface ProgressionPreviewProps {
  exercise: ExerciseData
  unit: string
}

export function ProgressionPreview({ exercise, unit }: ProgressionPreviewProps) {
  // Check if all sets are completed
  const allSetsCompleted = exercise.sets.every(set => set.completed)
  
  console.log('ProgressionPreview render:', {
    exercise: exercise.name,
    sets: exercise.sets,
    allSetsCompleted
  })
  
  if (!allSetsCompleted) {
    return null // Don't show preview until all sets are done
  }
  
  // Get the last set for AMRAP reps
  const lastSet = exercise.sets[exercise.sets.length - 1]
  const amrapReps = lastSet.isAmrap ? lastSet.reps : 0
  
  // Calculate total reps for T2
  const totalReps = exercise.sets.reduce((sum, set) => 
    sum + (set.completed ? set.reps : 0), 0
  )
  
  // Parse stage from string (e.g., "Stage 1" -> 1)
  const currentStage = parseInt(exercise.stage.replace('Stage ', '')) || 1
  
  const nextWorkout = calculateNextWorkout({
    exercise: exercise.type,
    tier: exercise.tier,
    currentWeight: exercise.weight,
    currentStage,
    allSetsCompleted,
    amrapReps,
    totalReps
  })
  
  // Format the preview text
  const tierLabel = `T${exercise.tier}`
  const exerciseName = exercise.name
  const setsReps = `${nextWorkout.sets}x${nextWorkout.reps}${exercise.tier === 3 ? '+' : ''}`
  const weight = `${nextWorkout.weight}${unit}`
  const progression = nextWorkout.progression
  
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      <span className="opacity-75">Next: </span>
      <span>{exerciseName} {tierLabel} - {setsReps} @ {weight}</span>
      <span className="ml-1 opacity-60">({progression})</span>
    </div>
  )
}