'use client'

import { useState, useEffect } from 'react'
import { ExerciseCard } from './exercise-card'
import { CompleteWorkoutButton } from './complete-workout-button'
import { RestTimer } from './rest-timer'
import { useRestTimer } from '@/hooks/use-rest-timer'
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
  const [lastT3Weights, setLastT3Weights] = useState<Record<string, { weight: number, shouldIncrease: boolean }>>({})
  const { startTime, startTimer } = useRestTimer()
  const [timerExerciseIndex, setTimerExerciseIndex] = useState<number | null>(null)
  
  // Fetch last workout data to check T3 progression
  useEffect(() => {
    const fetchLastWorkout = async () => {
      try {
        const response = await fetch('/api/workouts/last-t3')
        if (response.ok) {
          const data = await response.json()
          setLastT3Weights(data)
        }
      } catch (error) {
        console.error('Error fetching last T3 weights:', error)
      }
    }
    fetchLastWorkout()
  }, [])

  const [exercisesData, setExercisesData] = useState<ExerciseData[]>([])

  // Initialize exercise data with T3 weights
  useEffect(() => {
    const data = workout.exercises.map((exercise) => {
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
          
          // Debug logging
          console.log(`Exercise: ${exercise.name}, Tier: ${exercise.tier}, Type: ${exercise.type}`)
          console.log(`Progression:`, prog)
          console.log(`Stage value from DB: ${prog[stageKey]}`)
          console.log(`Weight from progression: ${prog[weightKey]}`)
          console.log(`Max from settings: ${settings[`${exercise.type}Max` as keyof UserSettings]}`)
          
          // Ensure stage is within valid range (1-3)
          const stageValue = Math.max(1, Math.min(3, prog[stageKey] || 1)) as 1 | 2 | 3
          const stage = stageConfig[tierKey][stageValue]
          
          // Use the weight from progression
          weight = prog[weightKey] || 0
          
          // Ensure weight is reasonable (not extremely high)
          // Don't enforce minimum if weight is explicitly 0
          if (weight > 0) {
            weight = Math.min(weight, 2000)
          }
          
          console.log(`Final weight: ${weight}, Sets: ${stage.sets}, Reps: ${stage.reps}`)
          
          sets = stage.sets
          reps = stage.reps
          stageName = stage.name
        }
      } else {
        // T3 accessories
        const lastT3 = lastT3Weights[exercise.name]
        if (lastT3) {
          // If we have previous data and should increase, add 5 lbs
          weight = lastT3.shouldIncrease ? lastT3.weight + 5 : lastT3.weight
        } else {
          weight = 45 // Default accessory weight
        }
        sets = stageConfig.t3.sets
        reps = stageConfig.t3.reps
        stageName = stageConfig.t3.name
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
    setExercisesData(data)
  }, [workout, settings, progressions, lastT3Weights])

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
      const wasCompleted = set.completed
      set.completed = !set.completed
      
      // Handle timer logic
      if (!wasCompleted && set.completed) {
        // Set was just completed
        const exercise = newData[exerciseIndex]
        const isLastSet = setIndex === exercise.sets.length - 1
        const isLastExercise = exerciseIndex === exercisesData.length - 1
        
        if (isLastExercise && isLastSet) {
          // Last set of last exercise - no timer needed
          setTimerExerciseIndex(null)
        } else if (isLastSet) {
          // Last set of exercise - show timer on next exercise
          setTimerExerciseIndex(exerciseIndex + 1)
          startTimer()
        } else {
          // More sets remaining in current exercise
          setTimerExerciseIndex(exerciseIndex)
          startTimer()
        }
      }
      
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
        <div key={index}>
          {timerExerciseIndex === index && (
            <RestTimer startTime={startTime} />
          )}
          <ExerciseCard
            exercise={exercise}
            exerciseIndex={index}
            unit={settings.unit}
            onAdjustWeight={adjustWeight}
            onToggleSet={toggleSet}
            onUpdateAmrapReps={updateAmrapReps}
            onSetWeight={setWeight}
          />
        </div>
      ))}
      <CompleteWorkoutButton 
        workoutKey={workoutKey}
        exercisesData={exercisesData}
      />
    </>
  )
}