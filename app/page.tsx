import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { WorkoutView } from '@/components/workout-view'
import { workouts } from '@/lib/constants'

export default async function WorkoutPage() {
  const user = await getOrCreateUser()
  const currentWorkoutIndex = user.settings?.currentWorkout || 0
  const workoutKeys = ['A1', 'B1', 'A2', 'B2'] as const
  const currentWorkoutKey = workoutKeys[currentWorkoutIndex]
  const currentWorkout = workouts[currentWorkoutKey]

  return (
    <AppContainer>
      <WorkoutView 
        workout={currentWorkout}
        workoutKey={currentWorkoutKey}
        settings={user.settings!}
        progressions={user.progressions}
      />
    </AppContainer>
  )
}