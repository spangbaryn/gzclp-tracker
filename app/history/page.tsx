import { AppContainer } from '@/components/app-container'
import { getOrCreateUser } from '@/lib/user'
import { prisma } from '@/lib/db'
import { HistoryList } from '@/components/history-list'

export default async function HistoryPage() {
  const user = await getOrCreateUser()

  // Get workout history
  const workoutHistory = await prisma.workout.findMany({
    where: { userId: user.id },
    include: {
      exercises: {
        include: {
          sets: {
            orderBy: { setNumber: 'asc' }
          }
        },
        orderBy: { id: 'asc' }
      }
    },
    orderBy: { completedAt: 'desc' },
    take: 20
  })

  return (
    <AppContainer>
      <HistoryList workoutHistory={workoutHistory} user={user} />
    </AppContainer>
  )
}