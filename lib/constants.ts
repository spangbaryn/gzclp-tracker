export const workouts = {
  A1: {
    name: 'A1',
    exercises: [
      { name: 'Squat', tier: 1, type: 'squat' },
      { name: 'Bench Press', tier: 2, type: 'bench' },
      { name: 'Lat Pulldown', tier: 3, type: 'accessory' }
    ]
  },
  B1: {
    name: 'B1',
    exercises: [
      { name: 'Overhead Press', tier: 1, type: 'ohp' },
      { name: 'Deadlift', tier: 2, type: 'deadlift' },
      { name: 'Dumbbell Row', tier: 3, type: 'accessory' }
    ]
  },
  A2: {
    name: 'A2',
    exercises: [
      { name: 'Bench Press', tier: 1, type: 'bench' },
      { name: 'Squat', tier: 2, type: 'squat' },
      { name: 'Lat Pulldown', tier: 3, type: 'accessory' }
    ]
  },
  B2: {
    name: 'B2',
    exercises: [
      { name: 'Deadlift', tier: 1, type: 'deadlift' },
      { name: 'Overhead Press', tier: 2, type: 'ohp' },
      { name: 'Dumbbell Row', tier: 3, type: 'accessory' }
    ]
  }
} as const

export const stageConfig = {
  t1: {
    1: { sets: 5, reps: 3, name: '5×3+' },
    2: { sets: 6, reps: 2, name: '6×2+' },
    3: { sets: 10, reps: 1, name: '10×1+' }
  },
  t2: {
    1: { sets: 3, reps: 10, name: '3×10', minVolume: 30 },
    2: { sets: 3, reps: 8, name: '3×8', minVolume: 24 },
    3: { sets: 3, reps: 6, name: '3×6', minVolume: 18 }
  }
} as const

export type WorkoutType = keyof typeof workouts
export type LiftType = 'squat' | 'bench' | 'deadlift' | 'ohp'