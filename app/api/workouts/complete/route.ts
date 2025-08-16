import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { stageConfig } from '@/lib/constants'
import { revalidatePath } from 'next/cache'

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
            // Completed all sets/reps - increase weight, stay at same stage
            const increment = (exercise.type === 'bench' || exercise.type === 'ohp') ? 5 : 10
            await prisma.progression.update({
              where: { id: progression.id },
              data: { 
                [weightKey]: exercise.weight + increment,
                // Keep same stage when progressing weight
                [stageKey]: progression[stageKey]
              }
            })
          } else {
            // Failed to complete - move to next stage with same weight
            const currentStage = progression[stageKey] as number
            const nextStage = currentStage + 1
            
            if (nextStage <= 3) {
              // Move to easier stage
              await prisma.progression.update({
                where: { id: progression.id },
                data: {
                  [stageKey]: nextStage,
                  [weightKey]: exercise.weight // Keep same weight
                }
              })
            } else {
              // Completed Stage 3 failure - need to reset
              // In real GZCLP, you'd test new 5RM and use 85%
              // For now, we'll reduce weight by 10% and reset to stage 1
              const resetWeight = Math.round(exercise.weight * 0.9)
              await prisma.progression.update({
                where: { id: progression.id },
                data: {
                  [stageKey]: 1,
                  [weightKey]: resetWeight
                }
              })
            }
          }
        }
      } else if (exercise.tier === 3) {
        // T3 Progression: Check if user hit 25+ reps on AMRAP
        const lastSet = exercise.sets[exercise.sets.length - 1]
        if (lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25) {
          // Store a note that this T3 should increase next time
          // We'll handle this by looking at the previous workout when loading
          console.log(`T3 ${exercise.name} achieved ${lastSet.reps} reps - should increase weight next time`)
        }
      }
    }

    // Update current workout
    const currentWorkout = user.settings!.currentWorkout
    const nextWorkout = (currentWorkout + 1) % 4
    
    console.log('=== WORKOUT PROGRESSION UPDATE ===')
    console.log('User ID:', user.id)
    console.log('Current workout index:', currentWorkout)
    console.log('Current workout key:', ['A1', 'B1', 'A2', 'B2'][currentWorkout])
    console.log('Next workout index:', nextWorkout)
    console.log('Next workout key:', ['A1', 'B1', 'A2', 'B2'][nextWorkout])
    console.log('Calculation: (', currentWorkout, '+ 1) % 4 =', nextWorkout)
    console.log('================================')
    
    const updatedSettings = await prisma.userSettings.update({
      where: { userId: user.id },
      data: { currentWorkout: nextWorkout }
    })
    
    console.log('Updated settings:', updatedSettings)
    
    // Verify the update
    const verifyUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { settings: true }
    })
    console.log('Verified user settings after update:', verifyUser?.settings)

    // Trigger revalidation for fresh data
    revalidatePath('/history')
    revalidatePath('/progress')
    revalidatePath('/')

    return NextResponse.json({ success: true, workoutId: workout.id })
  } catch (error) {
    console.error('Error completing workout:', error)
    return NextResponse.json({ error: 'Failed to complete workout' }, { status: 500 })
  }
}