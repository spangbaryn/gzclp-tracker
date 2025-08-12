import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { workouts } from '@/lib/constants'

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
        <div className="space-y-2">
          {user.progressions.map((prog) => {
            const liftName = prog.liftType === 'ohp' ? 'OHP' : 
              prog.liftType.charAt(0).toUpperCase() + prog.liftType.slice(1)
            const weight = prog.t1Weight || user.settings![`${prog.liftType}Max` as keyof typeof user.settings] as number
            
            return (
              <div key={prog.id} className="rounded-lg bg-white/[0.02] border border-white/5 p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-foreground font-semibold text-base">
                    {liftName}
                  </span>
                  <span className="text-foreground text-xl font-bold">
                    {weight} {user.settings!.unit}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted">
                  <span className="px-2 py-1 rounded bg-white/5">T1: Stage {prog.t1Stage}</span>
                  <span className="px-2 py-1 rounded bg-white/5">T2: Stage {prog.t2Stage}</span>
                </div>
              </div>
            )
          })}
        </div>
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