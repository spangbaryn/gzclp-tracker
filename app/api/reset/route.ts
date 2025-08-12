import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST() {
  console.log('Reset API called')
  try {
    const user = await getOrCreateUser()
    console.log('User found:', user.id)

    // Delete all workouts
    console.log('Deleting workouts...')
    const deletedWorkouts = await prisma.workout.deleteMany({
      where: { userId: user.id }
    })
    console.log('Deleted workouts:', deletedWorkouts.count)

    // Reset settings
    console.log('Resetting settings...')
    const updatedSettings = await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        currentWorkout: 0,
        squatMax: 0,
        benchMax: 0,
        deadliftMax: 0,
        ohpMax: 0
      }
    })
    console.log('Updated settings:', updatedSettings)

    // Reset progressions
    console.log('Resetting progressions...')
    const updatedProgressions = await prisma.progression.updateMany({
      where: { userId: user.id },
      data: {
        t1Stage: 1,
        t2Stage: 1,
        t1Weight: 0,
        t2Weight: 0
      }
    })
    console.log('Updated progressions:', updatedProgressions.count)

    console.log('Reset complete')
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error resetting data:', error)
    return NextResponse.json({ error: 'Failed to reset data' }, { status: 500 })
  }
}