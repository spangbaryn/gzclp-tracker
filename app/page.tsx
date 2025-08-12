import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { WorkoutView } from '@/components/workout-view'
import { SetupWeights } from '@/components/setup-weights'
import { workouts } from '@/lib/constants'

// Disable caching to ensure fresh data
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function WorkoutPage() {
  const user = await getOrCreateUser()
  const settings = user.settings!
  
  // Check if starting weights are configured (0 means not configured)
  const needsSetup = settings.squatMax === 0 || settings.benchMax === 0 || 
                     settings.deadliftMax === 0 || settings.ohpMax === 0
  
  console.log('Settings:', settings)
  console.log('Needs setup:', needsSetup)
  console.log('Weight values:', {
    squatMax: settings.squatMax,
    benchMax: settings.benchMax,
    deadliftMax: settings.deadliftMax,
    ohpMax: settings.ohpMax
  })

  if (needsSetup) {
    return (
      <AppContainer>
        <SetupWeights unit={settings.unit} />
      </AppContainer>
    )
  }

  const currentWorkoutIndex = settings.currentWorkout || 0
  const workoutKeys = ['A1', 'B1', 'A2', 'B2'] as const
  const currentWorkoutKey = workoutKeys[currentWorkoutIndex]
  const currentWorkout = workouts[currentWorkoutKey]

  // Debug logging
  console.log('Loading workout page:')
  console.log('Current workout index:', currentWorkoutIndex)
  console.log('Current workout key:', currentWorkoutKey)

  return (
    <AppContainer>
      <WorkoutView 
        workout={currentWorkout}
        workoutKey={currentWorkoutKey}
        settings={settings}
        progressions={user.progressions}
      />
    </AppContainer>
  )
}