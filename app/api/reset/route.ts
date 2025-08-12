import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST() {
  try {
    const user = await getOrCreateUser()

    // Delete all workouts
    await prisma.workout.deleteMany({
      where: { userId: user.id }
    })

    // Reset settings
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        currentWorkout: 0,
        squatMax: 0,
        benchMax: 0,
        deadliftMax: 0,
        ohpMax: 0
      }
    })

    // Reset progressions
    await prisma.progression.updateMany({
      where: { userId: user.id },
      data: {
        t1Stage: 1,
        t2Stage: 1,
        t1Weight: 0,
        t2Weight: 0
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting data:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}