'use client'

import { useState, useEffect } from 'react'
import { ExerciseCard } from './exercise-card'
import { CompleteWorkoutButton } from './complete-workout-button'
import { RestTimer } from './rest-timer'
import { useRestTimer } from '@/hooks/use-rest-timer'
import type { Progression, UserSettings, User, Exercise, Set } from '@prisma/client'
import type { WorkoutType } from '@/lib/constants'
import { workouts, stageConfig } from '@/lib/constants'

interface WorkoutViewProps {
  workout: typeof workouts[WorkoutType]
  workoutKey: WorkoutType
  settings: UserSettings
  progressions: Progression[]
  user: User & { settings: UserSettings | null }
  onCompleteSet?: (exerciseId: string, setId: string, completedReps: number) => Promise<void>
}

export interface ExerciseData {
  name: string
  tier: number
  type: string
  weight: number
  sets: {
    reps: number
    currentReps?: number  // Track current reps separately for cycling
    completed: boolean
    isAmrap: boolean
  }[]
  stage: string
}

const WORKOUT_STATE_KEY = 'gzclp-current-workout-state'

export function WorkoutView({ workout, workoutKey, settings, progressions, user, onCompleteSet }: WorkoutViewProps) {
  const [lastT3Weights, setLastT3Weights] = useState<Record<string, { weight: number, shouldIncrease: boolean }>>({})
  const { startTime, startTimer, stopTimer } = useRestTimer()
  const [timerExerciseIndex, setTimerExerciseIndex] = useState<number | null>(null)
  const [lastExercises, setLastExercises] = useState<Record<string, { exercise: Exercise & { sets: Set[] }, workoutDate: Date }>>({})
  
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

  // Fetch last exercise data for each exercise
  useEffect(() => {
    const fetchLastExercises = async () => {
      try {
        const response = await fetch('/api/workouts/last-exercises', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            exercises: workout.exercises.map(ex => ({
              name: ex.name,
              tier: ex.tier,
              type: ex.type
            }))
          })
        })
        
        if (response.ok) {
          const data = await response.json()
          setLastExercises(data)
        }
      } catch (error) {
        console.error('Error fetching last exercises:', error)
      }
    }
    
    if (user.id && workout.exercises.length > 0) {
      fetchLastExercises()
    }
  }, [user.id, workout])

  const [exercisesData, setExercisesData] = useState<ExerciseData[]>([])
  const [isInitialized, setIsInitialized] = useState(false)

  // Save to localStorage whenever exercisesData or timer changes
  useEffect(() => {
    if (isInitialized && exercisesData.length > 0) {
      const stateToSave = {
        workoutKey,
        exercisesData,
        timerState: {
          startTime,
          timerExerciseIndex
        },
        timestamp: Date.now()
      }
      localStorage.setItem(WORKOUT_STATE_KEY, JSON.stringify(stateToSave))
    }
  }, [exercisesData, workoutKey, isInitialized, startTime, timerExerciseIndex])

  // Initialize exercise data with T3 weights
  useEffect(() => {
    // Check localStorage first
    const savedState = localStorage.getItem(WORKOUT_STATE_KEY)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // Only restore if it's the same workout and less than 24 hours old
        if (parsed.workoutKey === workoutKey && 
            Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
          setExercisesData(parsed.exercisesData)
          
          // Restore timer state if present
          if (parsed.timerState) {
            const { startTime: savedStartTime, timerExerciseIndex: savedTimerIndex } = parsed.timerState
            if (savedStartTime && savedTimerIndex !== null) {
              // Restore the original start time - the hook will calculate elapsed time
              startTimer(savedStartTime)
              setTimerExerciseIndex(savedTimerIndex)
            }
          }
          
          setIsInitialized(true)
          return
        }
      } catch (error) {
        console.error('Error parsing saved workout state:', error)
      }
    }

    // If no valid saved state, initialize normally
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
      
      const exerciseData = {
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
      
      
      return exerciseData
    })
    setExercisesData(data)
    setIsInitialized(true)
  }, [workout, settings, progressions, lastT3Weights, workoutKey, startTimer])

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

  const toggleSet = async (exerciseIndex: number, setIndex: number) => {
    setExercisesData(prev => {
      // Create a deep copy to ensure we're not mutating
      const newData = prev.map((exercise, eIdx) => {
        if (eIdx !== exerciseIndex) return exercise
        
        return {
          ...exercise,
          sets: exercise.sets.map((set, sIdx) => {
            if (sIdx !== setIndex) return set
            
            // Handle the specific set being toggled
            if (!set.isAmrap) {
              if (!set.completed) {
                // First tap: just mark as completed
                // Call onCompleteSet if provided for offline sync
                if (onCompleteSet) {
                  const exerciseName = exercise.name
                  const setId = `${exerciseName}-${setIndex}`
                  // Only call if we have the function, but don't break if it fails
                  try {
                    onCompleteSet(exerciseName, setId, set.reps).catch(err => {
                      console.warn('Failed to sync set completion:', err)
                    })
                  } catch (err) {
                    console.warn('Failed to call onCompleteSet:', err)
                  }
                }
                return { ...set, completed: true }
              } else {
                // Already completed, cycle the reps
                const currentReps = set.currentReps !== undefined ? set.currentReps : set.reps
                
                if (currentReps > 1) {
                  // Decrement reps
                  return { 
                    ...set, 
                    currentReps: currentReps - 1
                  }
                } else {
                  // At 1 rep, revert to uncompleted state
                  return { 
                    ...set, 
                    completed: false,
                    currentReps: undefined
                  }
                }
              }
            } else {
              // AMRAP sets just toggle
              return { ...set, completed: !set.completed }
            }
          })
        }
      })
      
      // Handle timer logic
      const exercise = newData[exerciseIndex]
      const set = exercise.sets[setIndex]
      const wasCompleted = prev[exerciseIndex].sets[setIndex].completed
      
      if (!wasCompleted && set.completed) {
        // Set was just completed
        const isLastSet = setIndex === exercise.sets.length - 1
        const isLastExercise = exerciseIndex === newData.length - 1
        
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
      {/* Workout name header */}
      <div className="text-center mb-6">
        <h1 className="text-sm font-bold uppercase tracking-[2px] text-muted">
          Workout {workoutKey}
        </h1>
      </div>
      
      {exercisesData.map((exercise, index) => (
        <div key={index}>
          {timerExerciseIndex === index && (
            <RestTimer 
              startTime={startTime} 
              onDismiss={() => {
                stopTimer()
                setTimerExerciseIndex(null)
              }}
            />
          )}
          <ExerciseCard
            exercise={exercise}
            exerciseIndex={index}
            unit={settings.unit}
            onAdjustWeight={adjustWeight}
            onToggleSet={toggleSet}
            onUpdateAmrapReps={updateAmrapReps}
            onSetWeight={setWeight}
            lastExercise={lastExercises[`${exercise.name}-${exercise.tier}`]?.exercise}
            lastWorkoutDate={lastExercises[`${exercise.name}-${exercise.tier}`]?.workoutDate}
            user={user}
          />
        </div>
      ))}
      <CompleteWorkoutButton 
        workoutKey={workoutKey}
        exercisesData={exercisesData}
        onComplete={() => {
          // Clear saved state when workout is completed
          localStorage.removeItem(WORKOUT_STATE_KEY)
        }}
      />
    </>
  )
}