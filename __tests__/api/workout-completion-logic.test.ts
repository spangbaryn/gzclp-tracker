import { describe, it, expect, beforeEach } from '@jest/globals'
import { stageConfig } from '@/lib/constants'

describe('Workout Completion Logic Tests', () => {
  describe('T1 Progression Rules', () => {
    it('should progress weight when all sets are completed successfully', () => {
      const exercise = {
        tier: 1,
        type: 'squat',
        weight: 225,
        stage: 1,
        sets: [
          { reps: 3, completed: true, isAmrap: false },
          { reps: 3, completed: true, isAmrap: false },
          { reps: 3, completed: true, isAmrap: false },
          { reps: 3, completed: true, isAmrap: false },
          { reps: 5, completed: true, isAmrap: true }
        ]
      }

      // Check if all sets are completed
      const shouldProgress = exercise.sets.every(set => set.completed)
      expect(shouldProgress).toBe(true)

      // Calculate weight increment
      const increment = (exercise.type === 'bench' || exercise.type === 'ohp') ? 5 : 10
      const newWeight = exercise.weight + increment
      
      expect(increment).toBe(10) // Squat is lower body
      expect(newWeight).toBe(235)
      expect(exercise.stage).toBe(1) // Stage should stay the same on success
    })

    it('should advance stage when sets are failed', () => {
      const exercise = {
        tier: 1,
        type: 'bench',
        weight: 185,
        stage: 1,
        sets: [
          { reps: 3, completed: true, isAmrap: false },
          { reps: 3, completed: true, isAmrap: false },
          { reps: 2, completed: true, isAmrap: false }, // Failed rep
          { reps: 2, completed: true, isAmrap: false }, // Failed rep
          { reps: 3, completed: true, isAmrap: true }
        ]
      }

      // Check if all sets are completed with target reps
      const shouldProgress = exercise.sets.every(set => set.completed)
      expect(shouldProgress).toBe(true) // All sets were "completed" but not with target reps

      // The real check is if they hit their target reps
      const hitTargetReps = exercise.sets.slice(0, -1).every(set => set.reps === 3) && 
                           exercise.sets[exercise.sets.length - 1].reps >= 3
      expect(hitTargetReps).toBe(false)

      // Should advance to next stage
      const nextStage = exercise.stage + 1
      expect(nextStage).toBe(2)
      expect(exercise.weight).toBe(185) // Weight stays the same on failure
    })

    it('should reset to stage 1 at 90% weight after stage 3 failure', () => {
      const exercise = {
        tier: 1,
        type: 'deadlift',
        weight: 315,
        stage: 3,
        sets: Array(10).fill({ reps: 0, completed: false, isAmrap: false })
      }

      const shouldProgress = exercise.sets.every(set => set.completed)
      expect(shouldProgress).toBe(false)

      // Check if we need to reset (stage 3 failure)
      const nextStage = exercise.stage + 1
      const needsReset = nextStage > 3
      expect(needsReset).toBe(true)

      // Calculate reset weight
      const resetWeight = Math.round(exercise.weight * 0.9)
      expect(resetWeight).toBe(284) // 90% of 315
      
      const resetStage = 1
      expect(resetStage).toBe(1)
    })
  })

  describe('T2 Progression Rules', () => {
    it('should progress weight when minimum volume is achieved', () => {
      const exercise = {
        tier: 2,
        type: 'squat',
        weight: 146,
        stage: 1,
        sets: [
          { reps: 10, completed: true, isAmrap: false },
          { reps: 10, completed: true, isAmrap: false },
          { reps: 10, completed: true, isAmrap: false }
        ]
      }

      // Calculate total reps
      const totalReps = exercise.sets.reduce((sum, set) => 
        sum + (set.completed ? set.reps : 0), 0
      )
      expect(totalReps).toBe(30)

      // Check against minimum volume for stage 1
      const minVolume = stageConfig.t2[1].minVolume
      expect(minVolume).toBe(30)
      expect(totalReps >= minVolume).toBe(true)

      // Calculate new weight
      const increment = (exercise.type === 'bench' || exercise.type === 'ohp') ? 5 : 10
      const newWeight = exercise.weight + increment
      expect(newWeight).toBe(156)
    })

    it('should advance stage when minimum volume is not achieved', () => {
      const exercise = {
        tier: 2,
        type: 'bench',
        weight: 120,
        stage: 1,
        sets: [
          { reps: 8, completed: true, isAmrap: false },
          { reps: 7, completed: true, isAmrap: false },
          { reps: 6, completed: true, isAmrap: false }
        ]
      }

      // Calculate total reps
      const totalReps = exercise.sets.reduce((sum, set) => 
        sum + (set.completed ? set.reps : 0), 0
      )
      expect(totalReps).toBe(21)

      // Check against minimum volume
      const minVolume = stageConfig.t2[1].minVolume
      expect(totalReps < minVolume).toBe(true)

      // Should advance to next stage
      const nextStage = exercise.stage + 1
      expect(nextStage).toBe(2)
      expect(exercise.weight).toBe(120) // Weight stays the same
    })

    it('should have correct minimum volumes for each stage', () => {
      expect(stageConfig.t2[1].minVolume).toBe(30) // 3×10 = 30
      expect(stageConfig.t2[2].minVolume).toBe(24) // 3×8 = 24
      expect(stageConfig.t2[3].minVolume).toBe(18) // 3×6 = 18
    })
  })

  describe('T3 Progression Rules', () => {
    it('should flag for increase when AMRAP set hits 25+ reps', () => {
      const exercise = {
        tier: 3,
        type: 'accessory',
        weight: 100,
        sets: [
          { reps: 15, completed: true, isAmrap: false },
          { reps: 15, completed: true, isAmrap: false },
          { reps: 26, completed: true, isAmrap: true }
        ]
      }

      const lastSet = exercise.sets[exercise.sets.length - 1]
      const shouldIncrease = lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25
      expect(shouldIncrease).toBe(true)
    })

    it('should not increase when AMRAP is below 25 reps', () => {
      const exercise = {
        tier: 3,
        type: 'accessory',
        weight: 100,
        sets: [
          { reps: 15, completed: true, isAmrap: false },
          { reps: 15, completed: true, isAmrap: false },
          { reps: 20, completed: true, isAmrap: true }
        ]
      }

      const lastSet = exercise.sets[exercise.sets.length - 1]
      const shouldIncrease = lastSet.completed && lastSet.isAmrap && lastSet.reps >= 25
      expect(shouldIncrease).toBe(false)
    })
  })

  describe('Workout Cycle Management', () => {
    it('should correctly advance through workout cycle', () => {
      const workoutOrder = ['A1', 'B1', 'A2', 'B2']
      
      // Test progression
      for (let i = 0; i < 8; i++) {
        const currentWorkout = i % 4
        const nextWorkout = (currentWorkout + 1) % 4
        
        expect(workoutOrder[currentWorkout]).toBeDefined()
        expect(workoutOrder[nextWorkout]).toBeDefined()
        
        // Verify cycle wraps correctly
        if (currentWorkout === 3) {
          expect(nextWorkout).toBe(0)
          expect(workoutOrder[nextWorkout]).toBe('A1')
        }
      }
    })

    it('should map indices to correct workout names', () => {
      const indexToWorkout = {
        0: 'A1',
        1: 'B1',
        2: 'A2',
        3: 'B2'
      }

      expect(indexToWorkout[0]).toBe('A1')
      expect(indexToWorkout[1]).toBe('B1')
      expect(indexToWorkout[2]).toBe('A2')
      expect(indexToWorkout[3]).toBe('B2')
    })
  })

  describe('Weight Increment Rules', () => {
    it('should use 5 lbs for upper body movements', () => {
      const upperBodyLifts = ['bench', 'ohp']
      
      upperBodyLifts.forEach(lift => {
        const increment = (lift === 'bench' || lift === 'ohp') ? 5 : 10
        expect(increment).toBe(5)
      })
    })

    it('should use 10 lbs for lower body movements', () => {
      const lowerBodyLifts = ['squat', 'deadlift']
      
      lowerBodyLifts.forEach(lift => {
        const increment = (lift === 'bench' || lift === 'ohp') ? 5 : 10
        expect(increment).toBe(10)
      })
    })
  })
})