import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ liftType: string }> }
) {
  try {
    const user = await getOrCreateUser()
    const { liftType } = await params

    // Get all workouts where this lift was performed
    const workouts = await prisma.workout.findMany({
      where: {
        userId: user.id,
        exercises: {
          some: {
            type: liftType
          }
        }
      },
      include: {
        exercises: {
          where: {
            type: liftType
          },
          include: {
            sets: true
          }
        }
      },
      orderBy: {
        completedAt: 'asc'
      }
    })

    // Transform data for the chart
    const progressData = workouts.map(workout => {
      const exercise = workout.exercises[0]
      const completedSets = exercise.sets.filter(s => s.completed).length
      const totalVolume = exercise.sets.reduce((sum, set) =>
        sum + (set.completed ? set.completedReps * exercise.weight : 0), 0
      )

      return {
        date: workout.completedAt,
        weight: exercise.weight,
        tier: exercise.tier,
        stage: exercise.stage,
        completedSets,
        totalSets: exercise.sets.length,
        volume: totalVolume,
        workoutType: workout.workoutType
      }
    })

    return NextResponse.json(progressData)
  } catch (error) {
    console.error('Error fetching progress data:', error)
    return NextResponse.json({ error: 'Failed to fetch progress' }, { status: 500 })
  }
}
