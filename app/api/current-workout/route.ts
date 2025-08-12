import { NextResponse } from 'next/server'
import { getOrCreateUser } from '@/lib/user'

export async function GET() {
  try {
    const user = await getOrCreateUser()
    const settings = user.settings!
    
    const workoutKeys = ['A1', 'B1', 'A2', 'B2'] as const
    const currentWorkoutIndex = settings.currentWorkout || 0
    const currentWorkoutKey = workoutKeys[currentWorkoutIndex]
    
    return NextResponse.json({
      currentWorkout: currentWorkoutIndex,
      currentWorkoutKey,
      timestamp: Date.now()
    })
  } catch (error) {
    console.error('Error getting current workout:', error)
    return NextResponse.json({ error: 'Failed to get current workout' }, { status: 500 })
  }
}