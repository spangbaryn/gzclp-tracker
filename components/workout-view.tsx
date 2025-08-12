'use client'

import { useState } from 'react'
import { ExerciseCard } from './exercise-card'
import { CompleteWorkoutButton } from './complete-workout-button'
import type { Progression, UserSettings } from '@prisma/client'
import type { WorkoutType } from '@/lib/constants'
import { workouts, stageConfig } from '@/lib/constants'

interface WorkoutViewProps {
  workout: typeof workouts[WorkoutType]
  workoutKey: WorkoutType
  settings: UserSettings
  progressions: Progression[]
}

export interface ExerciseData {
  name: string
  tier: number
  type: string
  weight: number
  sets: {
    reps: number
    completed: boolean
    isAmrap: boolean
  }[]
  stage: string
}

export function WorkoutView({ workout, workoutKey, settings, progressions }: WorkoutViewProps) {
  const [exercisesData, setExercisesData] = useState<ExerciseData[]>(() => {
    return workout.exercises.map((exercise) => {
      let weight = 0
      let sets = 3
      let reps = 15
      let stageName = ''
      
      if (exercise.tier === 1 || exercise.tier === 2) {
        const prog = progressions.find(p => p.liftType === exercise.type)
        if (prog) {
          const tierKey = exercise.tier === 1 ? 't1' : 't2'
          const stageKey = exercise.tier === 1 ? 't1Stage' : 't2Stage'
          const weightKey = exercise.tier === 1 ? 't1Weight' : 't2Weight'
          
          const stage = stageConfig[tierKey][prog[stageKey] as 1 | 2 | 3]
          weight = prog[weightKey] || (exercise.tier === 1 
            ? settings[`${exercise.type}Max` as keyof UserSettings] as number
            : Math.round((settings[`${exercise.type}Max` as keyof UserSettings] as number) * 0.65))
          sets = stage.sets
          reps = stage.reps
          stageName = stage.name
        }
      } else {
        weight = 45 // Default accessory weight
      }
      
      return {
        name: exercise.name,
        tier: exercise.tier,
        type: exercise.type,
        weight: weight,
        sets: Array.from({ length: sets }, (_, i) => ({
          reps: reps,
          completed: false,
          isAmrap: i === sets - 1
        })),
        stage: stageName
      }
    })
  })

  const adjustWeight = (exerciseIndex: number, amount: number) => {
    setExercisesData(prev => {
      const newData = [...prev]
      newData[exerciseIndex].weight = Math.max(0, newData[exerciseIndex].weight + amount)
      return newData
    })
  }

  const setWeight = (exerciseIndex: number, weight: number) => {
    setExercisesData(prev => {
      const newData = [...prev]
      newData[exerciseIndex].weight = Math.max(0, weight)
      return newData
    })
  }

  const toggleSet = (exerciseIndex: number, setIndex: number) => {
    setExercisesData(prev => {
      const newData = [...prev]
      const set = newData[exerciseIndex].sets[setIndex]
      set.completed = !set.completed
      return newData
    })
  }

  const updateAmrapReps = (exerciseIndex: number, setIndex: number, value: number) => {
    setExercisesData(prev => {
      const newData = [...prev]
      newData[exerciseIndex].sets[setIndex].reps = value
      return newData
    })
  }

  return (
    <>
      {exercisesData.map((exercise, index) => (
        <ExerciseCard
          key={index}
          exercise={exercise}
          exerciseIndex={index}
          unit={settings.unit}
          onAdjustWeight={adjustWeight}
          onToggleSet={toggleSet}
          onUpdateAmrapReps={updateAmrapReps}
          onSetWeight={setWeight}
        />
      ))}
      <CompleteWorkoutButton 
        workoutKey={workoutKey}
        exercisesData={exercisesData}
        progressions={progressions}
      />
    </>
  )
}