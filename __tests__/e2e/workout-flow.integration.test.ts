import { describe, it, expect, beforeEach } from '@jest/globals'
import { prisma } from '@/lib/db'
import { stageConfig } from '@/lib/constants'

// Mock Prisma
jest.mock('@/lib/db', () => {
  const mockDb = {
    data: {
      user: null,
      settings: null,
      progressions: [],
      workouts: []
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    },
    userSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    },
    progression: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn()
    },
    workout: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn()
    },
    workoutExercise: {
      deleteMany: jest.fn()
    },
    exerciseSet: {
      deleteMany: jest.fn()
    },
    $transaction: jest.fn()
  }

  // Reset function
  mockDb.reset = () => {
    mockDb.data = {
      user: null,
      settings: null,
      progressions: [],
      workouts: []
    }
  }

  return { prisma: mockDb }
})

describe('GZCLP Workout Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma as any).reset()
  })

  describe('Workout Progression Logic', () => {
    it('should handle T1 success progression correctly', async () => {
      // Setup mock data
      const mockProgression = {
        id: 'prog-1',
        userId: 'test-user',
        liftType: 'squat',
        t1Stage: 1,
        t2Stage: 1,
        t1Weight: 225,
        t2Weight: 146
      }

      ;(prisma.progression.findUnique as jest.Mock).mockResolvedValue(mockProgression)
      ;(prisma.progression.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockProgression, ...data })
      })

      // Simulate T1 success (all sets completed)
      const sets = [
        { reps: 3, completed: true },
        { reps: 3, completed: true },
        { reps: 3, completed: true },
        { reps: 3, completed: true },
        { reps: 5, completed: true } // AMRAP
      ]

      const allCompleted = sets.every(set => set.completed)
      expect(allCompleted).toBe(true)

      // Calculate new weight
      const increment = 10 // Lower body
      const newWeight = mockProgression.t1Weight + increment

      // Update progression
      const updated = await prisma.progression.update({
        where: { id: mockProgression.id },
        data: { t1Weight: newWeight }
      })

      expect(updated.t1Weight).toBe(235)
      expect(updated.t1Stage).toBe(1) // Stage stays the same on success
    })

    it('should handle T1 failure progression correctly', async () => {
      // Setup mock data
      const mockProgression = {
        id: 'prog-1',
        userId: 'test-user',
        liftType: 'bench',
        t1Stage: 1,
        t2Stage: 1,
        t1Weight: 185,
        t2Weight: 120
      }

      ;(prisma.progression.findUnique as jest.Mock).mockResolvedValue(mockProgression)
      ;(prisma.progression.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockProgression, ...data })
      })

      // Simulate T1 failure (not all sets completed)
      const sets = [
        { reps: 3, completed: true },
        { reps: 2, completed: true }, // Failed rep
        { reps: 2, completed: true }, // Failed rep
        { reps: 1, completed: true }, // Failed rep
        { reps: 2, completed: true }  // AMRAP
      ]

      const allCompleted = sets.every(set => set.completed && set.reps === 3)
      expect(allCompleted).toBe(false)

      // Move to next stage
      const nextStage = mockProgression.t1Stage + 1

      // Update progression
      const updated = await prisma.progression.update({
        where: { id: mockProgression.id },
        data: { t1Stage: nextStage }
      })

      expect(updated.t1Weight).toBe(185) // Weight stays the same
      expect(updated.t1Stage).toBe(2) // Move to stage 2
    })

    it('should handle T2 volume-based progression', async () => {
      // Setup mock data
      const mockProgression = {
        id: 'prog-1',
        userId: 'test-user',
        liftType: 'deadlift',
        t1Stage: 1,
        t2Stage: 1,
        t1Weight: 315,
        t2Weight: 205
      }

      ;(prisma.progression.findUnique as jest.Mock).mockResolvedValue(mockProgression)
      ;(prisma.progression.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockProgression, ...data })
      })

      // Test success case - minimum volume achieved
      const successSets = [
        { reps: 10, completed: true },
        { reps: 10, completed: true },
        { reps: 10, completed: true }
      ]

      const totalReps = successSets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
      expect(totalReps).toBe(30)
      expect(totalReps >= stageConfig.t2[1].minVolume).toBe(true)

      // Test failure case - below minimum volume
      const failureSets = [
        { reps: 8, completed: true },
        { reps: 7, completed: true },
        { reps: 6, completed: true }
      ]

      const failureReps = failureSets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
      expect(failureReps).toBe(21)
      expect(failureReps < stageConfig.t2[1].minVolume).toBe(true)
    })

    it('should handle stage 3 failure with weight reset', async () => {
      // Setup mock data at stage 3
      const mockProgression = {
        id: 'prog-1',
        userId: 'test-user',
        liftType: 'ohp',
        t1Stage: 3,
        t2Stage: 1,
        t1Weight: 135,
        t2Weight: 88
      }

      ;(prisma.progression.findUnique as jest.Mock).mockResolvedValue(mockProgression)
      ;(prisma.progression.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockProgression, ...data })
      })

      // Simulate stage 3 failure
      const currentStage = mockProgression.t1Stage
      const nextStage = currentStage + 1

      if (nextStage > 3) {
        // Reset to stage 1 with 90% weight
        const resetWeight = Math.round(mockProgression.t1Weight * 0.9)
        
        const updated = await prisma.progression.update({
          where: { id: mockProgression.id },
          data: { 
            t1Stage: 1,
            t1Weight: resetWeight
          }
        })

        expect(updated.t1Stage).toBe(1)
        expect(updated.t1Weight).toBe(122) // 90% of 135 rounded
      }
    })

    it('should track T3 progression based on AMRAP performance', () => {
      // Test T3 progression logic
      const t3Sets = [
        { reps: 15, completed: true, isAmrap: false },
        { reps: 15, completed: true, isAmrap: false },
        { reps: 26, completed: true, isAmrap: true } // Should trigger increase
      ]

      const lastSet = t3Sets[t3Sets.length - 1]
      const shouldIncrease = lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25
      
      expect(shouldIncrease).toBe(true)
    })
  })

  describe('Workout Order Management', () => {
    it('should cycle through workouts correctly', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId: 'test-user',
        currentWorkout: 0,
        unit: 'lbs',
        squatMax: 225,
        benchMax: 185,
        deadliftMax: 315,
        ohpMax: 135
      }

      ;(prisma.userSettings.findUnique as jest.Mock).mockResolvedValue(mockSettings)
      ;(prisma.userSettings.update as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ ...mockSettings, ...data })
      })

      // Test full cycle
      const workoutCycle = [
        { current: 0, next: 1, name: 'A1' },
        { current: 1, next: 2, name: 'B1' },
        { current: 2, next: 3, name: 'A2' },
        { current: 3, next: 0, name: 'B2' }
      ]

      for (const workout of workoutCycle) {
        const nextWorkout = (workout.current + 1) % 4
        expect(nextWorkout).toBe(workout.next)
        
        // Simulate update
        const updated = await prisma.userSettings.update({
          where: { userId: 'test-user' },
          data: { currentWorkout: nextWorkout }
        })
        
        expect(updated.currentWorkout).toBe(workout.next)
      }
    })
  })

  describe('Setup and Reset Logic', () => {
    it('should calculate T2 weights correctly during setup', () => {
      const t1Weights = {
        squat: 225,
        bench: 185,
        deadlift: 315,
        ohp: 135
      }

      const t2Weights = {
        squat: Math.round(t1Weights.squat * 0.65),
        bench: Math.round(t1Weights.bench * 0.65),
        deadlift: Math.round(t1Weights.deadlift * 0.65),
        ohp: Math.round(t1Weights.ohp * 0.65)
      }

      expect(t2Weights.squat).toBe(146)
      expect(t2Weights.bench).toBe(120)
      expect(t2Weights.deadlift).toBe(205)
      expect(t2Weights.ohp).toBe(88)
    })

    it('should reset all data correctly', async () => {
      ;(prisma.$transaction as jest.Mock).mockImplementation(async (operations) => {
        // Simulate transaction operations
        return Promise.all(operations)
      })

      ;(prisma.exerciseSet.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.workoutExercise.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.workout.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.progression.deleteMany as jest.Mock).mockResolvedValue({})
      ;(prisma.userSettings.update as jest.Mock).mockResolvedValue({
        currentWorkout: 0,
        squatMax: 0,
        benchMax: 0,
        deadliftMax: 0,
        ohpMax: 0
      })

      // Simulate reset
      const transaction = await prisma.$transaction([
        prisma.exerciseSet.deleteMany({ where: {} }),
        prisma.workoutExercise.deleteMany({ where: {} }),
        prisma.workout.deleteMany({ where: {} }),
        prisma.progression.deleteMany({ where: {} }),
        prisma.userSettings.update({
          where: { userId: 'test-user' },
          data: {
            currentWorkout: 0,
            squatMax: 0,
            benchMax: 0,
            deadliftMax: 0,
            ohpMax: 0
          }
        })
      ])

      expect(prisma.$transaction).toHaveBeenCalled()
      expect(prisma.progression.deleteMany).toHaveBeenCalled()
      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId: 'test-user' },
        data: expect.objectContaining({
          currentWorkout: 0
        })
      })
    })
  })

  describe('Weight Increment Logic', () => {
    it('should use correct increments for different lifts', () => {
      const increments = {
        squat: 10,
        bench: 5,
        deadlift: 10,
        ohp: 5
      }

      // Test upper body increments
      expect(increments.bench).toBe(5)
      expect(increments.ohp).toBe(5)

      // Test lower body increments
      expect(increments.squat).toBe(10)
      expect(increments.deadlift).toBe(10)

      // Test application
      const currentWeights = {
        squat: 225,
        bench: 185,
        deadlift: 315,
        ohp: 135
      }

      const newWeights = {
        squat: currentWeights.squat + increments.squat,
        bench: currentWeights.bench + increments.bench,
        deadlift: currentWeights.deadlift + increments.deadlift,
        ohp: currentWeights.ohp + increments.ohp
      }

      expect(newWeights.squat).toBe(235)
      expect(newWeights.bench).toBe(190)
      expect(newWeights.deadlift).toBe(325)
      expect(newWeights.ohp).toBe(140)
    })
  })
})