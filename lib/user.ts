import { prisma } from './db'

// Since there's no login, we'll use a fixed user ID
const DEFAULT_USER_ID = 'default-user'

export async function getOrCreateUser() {
  // Check if default user exists
  let user = await prisma.user.findUnique({
    where: { id: DEFAULT_USER_ID },
    include: { settings: true, progressions: true }
  })

  // If not, create it
  if (!user) {
    user = await prisma.user.create({
      data: {
        id: DEFAULT_USER_ID,
        settings: {
          create: {
            unit: 'lbs',
            currentWorkout: 0,
            squatMax: 0,
            benchMax: 0,
            deadliftMax: 0,
            ohpMax: 0
          }
        },
        progressions: {
          create: [
            { liftType: 'squat', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
            { liftType: 'bench', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
            { liftType: 'deadlift', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
            { liftType: 'ohp', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 }
          ]
        }
      },
      include: { settings: true, progressions: true }
    })
  }

  return user
}