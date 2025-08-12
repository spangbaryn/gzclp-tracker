import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { prisma } from '@/lib/db'

export default async function HistoryPage() {
  const user = await getOrCreateUser()

  // Get workout history
  const workoutHistory = await prisma.workout.findMany({
    where: { userId: user.id },
    include: {
      exercises: {
        include: {
          sets: true
        }
      }
    },
    orderBy: { completedAt: 'desc' },
    take: 20
  })

  return (
    <AppContainer>
      {workoutHistory.length === 0 ? (
        <div className="glass rounded-lg p-6 text-center text-muted">
          No workout history yet
        </div>
      ) : (
        <div className="space-y-3">
          {workoutHistory.map((workout) => {
            const date = new Date(workout.completedAt)
            const dateStr = date.toLocaleDateString() + ' ' + 
              date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
            
            return (
              <div key={workout.id} className="glass glass-gradient rounded-lg p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-lg font-bold text-foreground tracking-[0.5px]">
                    {workout.workoutType}
                  </div>
                  <div className="text-xs text-muted uppercase tracking-[1px]">
                    {dateStr}
                  </div>
                </div>
                <div className="space-y-1">
                  {workout.exercises.map((ex) => {
                    const completedSets = ex.sets.filter(s => s.completed).length
                    const totalReps = ex.sets.reduce((sum, set) => sum + (set.completed ? set.completedReps : 0), 0)
                    return (
                      <div key={ex.id} className="flex justify-between text-sm py-1">
                        <span className="text-muted">{ex.name}</span>
                        <span className="text-foreground font-medium">
                          {ex.weight}{user.settings!.unit} × {completedSets} sets ({totalReps} reps)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </AppContainer>
  )
}