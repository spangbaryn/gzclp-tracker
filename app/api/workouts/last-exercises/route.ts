import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { userId, exercises } = await request.json()
    
    const lastExercises: Record<string, any> = {}
    
    // For each exercise, find the last workout where it was performed
    for (const exercise of exercises) {
      const lastWorkout = await prisma.workout.findFirst({
        where: {
          userId,
          exercises: {
            some: {
              name: exercise.name,
              tier: exercise.tier
            }
          }
        },
        include: {
          exercises: {
            where: {
              name: exercise.name,
              tier: exercise.tier
            },
            include: {
              sets: {
                orderBy: { setNumber: 'asc' }
              }
            }
          }
        },
        orderBy: { completedAt: 'desc' }
      })
      
      if (lastWorkout && lastWorkout.exercises.length > 0) {
        const key = `${exercise.name}-${exercise.tier}`
        lastExercises[key] = {
          exercise: lastWorkout.exercises[0],
          workoutDate: lastWorkout.completedAt
        }
      }
    }
    
    return NextResponse.json(lastExercises)
  } catch (error) {
    console.error('Error fetching last exercises:', error)
    return NextResponse.json({ error: 'Failed to fetch last exercises' }, { status: 500 })
  }
}