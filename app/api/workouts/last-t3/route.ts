import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET() {
  try {
    const user = await getOrCreateUser()
    
    // Get the last completed workout
    const lastWorkout = await prisma.workout.findFirst({
      where: { userId: user.id },
      orderBy: { completedAt: 'desc' },
      include: {
        exercises: {
          where: { tier: 3 },
          include: {
            sets: {
              where: { isAmrap: true }
            }
          }
        }
      }
    })

    if (!lastWorkout) {
      return NextResponse.json({})
    }

    // Build T3 weight data
    const t3Weights: Record<string, { weight: number, shouldIncrease: boolean }> = {}
    
    for (const exercise of lastWorkout.exercises) {
      const amrapSet = exercise.sets[0] // There's only one AMRAP set per T3
      const shouldIncrease = amrapSet && amrapSet.completed && amrapSet.completedReps >= 25
      
      t3Weights[exercise.name] = {
        weight: exercise.weight,
        shouldIncrease
      }
    }

    return NextResponse.json(t3Weights)
  } catch (error) {
    console.error('Error fetching last T3 weights:', error)
    return NextResponse.json({})
  }
}