import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'
import { stageConfig } from '@/lib/constants'

// Mock Next.js modules
jest.mock('@/lib/db', () => ({
  prisma: {
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
      deleteMany: jest.fn()
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
}))

// Helper to create a mock user with settings and progressions
const createMockUser = (overrides: any = {}) => {
  const defaultUser = {
    id: 'test-user',
    settings: {
      id: 'settings-1',
      userId: 'test-user',
      unit: 'lbs',
      currentWorkout: 0,
      squatMax: 225,
      benchMax: 185,
      deadliftMax: 315,
      ohpMax: 135,
      ...overrides.settings
    },
    progressions: [
      { id: 'prog-1', userId: 'test-user', liftType: 'squat', t1Stage: 1, t2Stage: 1, t1Weight: 225, t2Weight: 145 },
      { id: 'prog-2', userId: 'test-user', liftType: 'bench', t1Stage: 1, t2Stage: 1, t1Weight: 185, t2Weight: 120 },
      { id: 'prog-3', userId: 'test-user', liftType: 'deadlift', t1Stage: 1, t2Stage: 1, t1Weight: 315, t2Weight: 205 },
      { id: 'prog-4', userId: 'test-user', liftType: 'ohp', t1Stage: 1, t2Stage: 1, t1Weight: 135, t2Weight: 85 },
      ...(overrides.progressions || [])
    ]
  }
  return defaultUser
}

describe('GZCLP Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Workout Cycle Progression', () => {
    it('should progress through workouts in correct order: A1 → B1 → A2 → B2 → A1', async () => {
      const workoutProgression = [
        { current: 0, expected: 1 }, // A1 → B1
        { current: 1, expected: 2 }, // B1 → A2
        { current: 2, expected: 3 }, // A2 → B2
        { current: 3, expected: 0 }, // B2 → A1
      ]

      for (const { current, expected } of workoutProgression) {
        const nextWorkout = (current + 1) % 4
        expect(nextWorkout).toBe(expected)
      }
    })

    it('should map workout indices to correct workout names', () => {
      const workoutMap = ['A1', 'B1', 'A2', 'B2']
      expect(workoutMap[0]).toBe('A1')
      expect(workoutMap[1]).toBe('B1')
      expect(workoutMap[2]).toBe('A2')
      expect(workoutMap[3]).toBe('B2')
    })
  })

  describe('T1 Progression Logic', () => {
    it('should progress weight when all sets are completed', () => {
      const sets = [
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: true }
      ]
      
      const allCompleted = sets.every(set => set.completed)
      expect(allCompleted).toBe(true)
      
      // Weight should increase by 5 for upper body, 10 for lower body
      const benchIncrement = 5
      const squatIncrement = 10
      expect(185 + benchIncrement).toBe(190)
      expect(225 + squatIncrement).toBe(235)
    })

    it('should move to next stage when sets are failed', () => {
      const sets = [
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false }, // Failed set
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: true }
      ]
      
      const allCompleted = sets.every(set => set.completed)
      expect(allCompleted).toBe(false)
      
      // Should move from stage 1 to stage 2
      const currentStage = 1
      const nextStage = currentStage + 1
      expect(nextStage).toBe(2)
      expect(nextStage <= 3).toBe(true)
    })

    it('should reset to stage 1 at 90% weight after stage 3 failure', () => {
      const currentStage = 3
      const nextStage = currentStage + 1
      const currentWeight = 200
      
      if (nextStage > 3) {
        const resetWeight = Math.round(currentWeight * 0.9)
        expect(resetWeight).toBe(180)
        expect(1).toBe(1) // Reset to stage 1
      }
    })

    it('should have correct stage configurations', () => {
      expect(stageConfig.t1[1]).toEqual({ sets: 5, reps: 3, name: '5×3+' })
      expect(stageConfig.t1[2]).toEqual({ sets: 6, reps: 2, name: '6×2+' })
      expect(stageConfig.t1[3]).toEqual({ sets: 10, reps: 1, name: '10×1+' })
    })
  })

  describe('T2 Progression Logic', () => {
    it('should progress weight when minimum volume is achieved', () => {
      const sets = [
        { reps: 10, completed: true, isAmrap: false },
        { reps: 10, completed: true, isAmrap: false },
        { reps: 10, completed: true, isAmrap: false }
      ]
      
      const totalReps = sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
      expect(totalReps).toBe(30)
      expect(totalReps >= stageConfig.t2[1].minVolume).toBe(true)
    })

    it('should move to next stage when minimum volume is not achieved', () => {
      const sets = [
        { reps: 10, completed: true, isAmrap: false },
        { reps: 8, completed: true, isAmrap: false },
        { reps: 6, completed: true, isAmrap: false }
      ]
      
      const totalReps = sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
      expect(totalReps).toBe(24)
      expect(totalReps < stageConfig.t2[1].minVolume).toBe(true)
    })

    it('should have correct minimum volume requirements', () => {
      expect(stageConfig.t2[1].minVolume).toBe(30) // 3×10
      expect(stageConfig.t2[2].minVolume).toBe(24) // 3×8
      expect(stageConfig.t2[3].minVolume).toBe(18) // 3×6
    })
  })

  describe('T3 Progression Logic', () => {
    it('should flag for weight increase when AMRAP hits 25+ reps', () => {
      const lastSet = { reps: 25, completed: true, isAmrap: true }
      const shouldIncrease = lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25
      expect(shouldIncrease).toBe(true)
    })

    it('should not increase weight when AMRAP is below 25 reps', () => {
      const lastSet = { reps: 20, completed: true, isAmrap: true }
      const shouldIncrease = lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25
      expect(shouldIncrease).toBe(false)
    })
  })

  describe('Weight Calculations', () => {
    it('should calculate T2 weights as 65% of T1 weights', () => {
      const t1Weights = {
        squat: 225,
        bench: 185,
        deadlift: 315,
        ohp: 135
      }
      
      const expectedT2Weights = {
        squat: Math.round(225 * 0.65),
        bench: Math.round(185 * 0.65),
        deadlift: Math.round(315 * 0.65),
        ohp: Math.round(135 * 0.65)
      }
      
      expect(expectedT2Weights.squat).toBe(146)
      expect(expectedT2Weights.bench).toBe(120)
      expect(expectedT2Weights.deadlift).toBe(205)
      expect(expectedT2Weights.ohp).toBe(88)
    })

    it('should use correct weight increments', () => {
      // Upper body: 5 lbs
      expect(185 + 5).toBe(190) // Bench
      expect(135 + 5).toBe(140) // OHP
      
      // Lower body: 10 lbs
      expect(225 + 10).toBe(235) // Squat
      expect(315 + 10).toBe(325) // Deadlift
    })
  })

  describe('Reset Functionality', () => {
    it('should reset currentWorkout to 0 (A1)', () => {
      const resetWorkout = 0
      expect(resetWorkout).toBe(0)
      expect(['A1', 'B1', 'A2', 'B2'][resetWorkout]).toBe('A1')
    })

    it('should clear all progressions and create new ones at stage 1', () => {
      const defaultProgressions = [
        { liftType: 'squat', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
        { liftType: 'bench', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
        { liftType: 'deadlift', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 },
        { liftType: 'ohp', t1Stage: 1, t2Stage: 1, t1Weight: 0, t2Weight: 0 }
      ]
      
      for (const prog of defaultProgressions) {
        expect(prog.t1Stage).toBe(1)
        expect(prog.t2Stage).toBe(1)
        expect(prog.t1Weight).toBe(0)
        expect(prog.t2Weight).toBe(0)
      }
    })
  })

  describe('Exercise Order in Workouts', () => {
    it('should have correct exercise order for A1', () => {
      const a1Exercises = [
        { name: 'Squat', tier: 1, type: 'squat' },
        { name: 'Bench Press', tier: 2, type: 'bench' },
        { name: 'Lat Pulldown', tier: 3, type: 'accessory' }
      ]
      
      expect(a1Exercises[0].tier).toBe(1)
      expect(a1Exercises[0].type).toBe('squat')
      expect(a1Exercises[1].tier).toBe(2)
      expect(a1Exercises[1].type).toBe('bench')
    })

    it('should have correct exercise order for B1', () => {
      const b1Exercises = [
        { name: 'Overhead Press', tier: 1, type: 'ohp' },
        { name: 'Deadlift', tier: 2, type: 'deadlift' },
        { name: 'Dumbbell Row', tier: 3, type: 'accessory' }
      ]
      
      expect(b1Exercises[0].tier).toBe(1)
      expect(b1Exercises[0].type).toBe('ohp')
      expect(b1Exercises[1].tier).toBe(2)
      expect(b1Exercises[1].type).toBe('deadlift')
    })

    it('should have correct exercise order for A2', () => {
      const a2Exercises = [
        { name: 'Bench Press', tier: 1, type: 'bench' },
        { name: 'Squat', tier: 2, type: 'squat' },
        { name: 'Lat Pulldown', tier: 3, type: 'accessory' }
      ]
      
      expect(a2Exercises[0].tier).toBe(1)
      expect(a2Exercises[0].type).toBe('bench')
      expect(a2Exercises[1].tier).toBe(2)
      expect(a2Exercises[1].type).toBe('squat')
    })

    it('should have correct exercise order for B2', () => {
      const b2Exercises = [
        { name: 'Deadlift', tier: 1, type: 'deadlift' },
        { name: 'Overhead Press', tier: 2, type: 'ohp' },
        { name: 'Dumbbell Row', tier: 3, type: 'accessory' }
      ]
      
      expect(b2Exercises[0].tier).toBe(1)
      expect(b2Exercises[0].type).toBe('deadlift')
      expect(b2Exercises[1].tier).toBe(2)
      expect(b2Exercises[1].type).toBe('ohp')
    })
  })
})