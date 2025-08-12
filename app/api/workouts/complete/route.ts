import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { stageConfig } from '@/lib/constants'

interface ExerciseSet {
  reps: number
  completed: boolean
  isAmrap: boolean
}

interface ExerciseData {
  name: string
  tier: number
  type: string
  weight: number
  stage: string
  sets: ExerciseSet[]
}

export async function POST(request: NextRequest) {
  try {
    const { workoutKey, exercises } = await request.json()
    const user = await getOrCreateUser()

    // Create workout record with exercises
    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        workoutType: workoutKey,
        exercises: {
          create: exercises.map((ex: ExerciseData) => ({
            name: ex.name,
            tier: ex.tier,
            type: ex.type,
            weight: ex.weight,
            stage: ex.stage,
            sets: {
              create: ex.sets.map((set: ExerciseSet, index: number) => ({
                setNumber: index + 1,
                targetReps: set.reps,
                completedReps: set.completed ? set.reps : 0,
                completed: set.completed,
                isAmrap: set.isAmrap
              }))
            }
          }))
        }
      }
    })

    // Update progressions
    for (const exercise of exercises) {
      if (exercise.tier === 1 || exercise.tier === 2) {
        const progression = await prisma.progression.findUnique({
          where: {
            userId_liftType: {
              userId: user.id,
              liftType: exercise.type
            }
          }
        })

        if (progression) {
          const tierKey = exercise.tier === 1 ? 't1' : 't2'
          const stageKey = exercise.tier === 1 ? 't1Stage' : 't2Stage'
          const weightKey = exercise.tier === 1 ? 't1Weight' : 't2Weight'
          
          const totalReps = exercise.sets.reduce((sum: number, set: ExerciseSet) => 
            sum + (set.completed ? set.reps : 0), 0
          )
          
          const stage = stageConfig[tierKey][progression[stageKey] as 1 | 2 | 3]
          let shouldProgress = false
          
          if (exercise.tier === 1) {
            // T1: Progress if all sets completed
            shouldProgress = exercise.sets.every((set: ExerciseSet) => set.completed)
          } else {
            // T2: Progress if minimum volume achieved
            const t2Stage = stage as { sets: number; reps: number; name: string; minVolume: number }
            shouldProgress = totalReps >= t2Stage.minVolume
          }
          
          if (shouldProgress) {
            // Increase weight
            const increment = (exercise.type === 'bench' || exercise.type === 'ohp') ? 5 : 10
            await prisma.progression.update({
              where: { id: progression.id },
              data: { [weightKey]: exercise.weight + increment }
            })
          } else {
            // Move to next stage
            const nextStage = progression[stageKey] + 1
            if (nextStage <= 3) {
              await prisma.progression.update({
                where: { id: progression.id },
                data: {
                  [stageKey]: nextStage,
                  [weightKey]: exercise.weight
                }
              })
            } else {
              // Reset to stage 1 (would need 5RM test)
              await prisma.progression.update({
                where: { id: progression.id },
                data: {
                  [stageKey]: 1,
                  [weightKey]: exercise.weight
                }
              })
            }
          }
        }
      }
    }

    // Update current workout
    const nextWorkout = (user.settings!.currentWorkout + 1) % 4
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: { currentWorkout: nextWorkout }
    })

    return NextResponse.json({ success: true, workoutId: workout.id })
  } catch (error) {
    console.error('Error completing workout:', error)
    return NextResponse.json({ error: 'Failed to complete workout' }, { status: 500 })
  }
}