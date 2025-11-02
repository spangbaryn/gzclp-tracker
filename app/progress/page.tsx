import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { workouts } from '@/lib/constants'
import { ProgressView } from '@/components/progress-view'

export default async function ProgressPage() {
  const user = await getOrCreateUser()
  const currentWorkoutIndex = user.settings?.currentWorkout || 0
  const workoutKeys = ['A1', 'B1', 'A2', 'B2'] as const
  const currentWorkoutKey = workoutKeys[currentWorkoutIndex]
  const nextWorkout = workouts[currentWorkoutKey]

  return (
    <AppContainer>
      <div className="glass glass-gradient rounded-lg p-6 mb-4">
        <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#a8a8a8] mb-6">
          Current Progress
        </h3>
        <ProgressView
          progressions={user.progressions}
          settings={user.settings!}
        />
      </div>

      <div className="glass glass-gradient rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#a8a8a8] mb-6">
          Next Workout
        </h3>
        <div className="text-lg font-bold text-foreground mb-4">
          {nextWorkout.name}
        </div>
        <div className="space-y-2">
          {nextWorkout.exercises.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded bg-white/[0.02] text-sm text-muted">
              <span className={`tier-${ex.tier} font-semibold`}>T{ex.tier}</span>
              <span>{ex.name}</span>
            </div>
          ))}
        </div>
      </div>
    </AppContainer>
  )
}