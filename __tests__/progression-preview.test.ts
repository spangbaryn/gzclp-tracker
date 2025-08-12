import { describe, it, expect } from '@jest/globals'
import { calculateNextWorkout } from '@/lib/progression-calculator'
import { stageConfig } from '@/lib/constants'

describe('Progression Preview Calculator', () => {
  describe('T1 Progression', () => {
    it('should increase weight by 10lbs for squat when all sets completed', () => {
      const result = calculateNextWorkout({
        exercise: 'squat',
        tier: 1,
        currentWeight: 225,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 5 // Doesn't matter for T1
      })

      expect(result).toEqual({
        weight: 235,
        stage: 1,
        sets: 5,
        reps: 3,
        progression: '+10lbs'
      })
    })

    it('should increase weight by 5lbs for bench when all sets completed', () => {
      const result = calculateNextWorkout({
        exercise: 'bench',
        tier: 1,
        currentWeight: 185,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 5
      })

      expect(result).toEqual({
        weight: 190,
        stage: 1,
        sets: 5,
        reps: 3,
        progression: '+5lbs'
      })
    })

    it('should move to stage 2 when sets not completed', () => {
      const result = calculateNextWorkout({
        exercise: 'squat',
        tier: 1,
        currentWeight: 225,
        currentStage: 1,
        allSetsCompleted: false,
        amrapReps: 0
      })

      expect(result).toEqual({
        weight: 225,
        stage: 2,
        sets: 6,
        reps: 2,
        progression: 'Stage 2'
      })
    })

    it('should move to stage 3 when failing stage 2', () => {
      const result = calculateNextWorkout({
        exercise: 'deadlift',
        tier: 1,
        currentWeight: 315,
        currentStage: 2,
        allSetsCompleted: false,
        amrapReps: 0
      })

      expect(result).toEqual({
        weight: 315,
        stage: 3,
        sets: 10,
        reps: 1,
        progression: 'Stage 3'
      })
    })

    it('should reset weight and return to stage 1 when failing stage 3', () => {
      const result = calculateNextWorkout({
        exercise: 'ohp',
        tier: 1,
        currentWeight: 135,
        currentStage: 3,
        allSetsCompleted: false,
        amrapReps: 0
      })

      expect(result).toEqual({
        weight: 122, // 90% of 135, rounded
        stage: 1,
        sets: 5,
        reps: 3,
        progression: 'Reset to 122lbs'
      })
    })
  })

  describe('T2 Progression', () => {
    it('should increase weight when meeting volume target', () => {
      const result = calculateNextWorkout({
        exercise: 'bench',
        tier: 2,
        currentWeight: 120,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 10,
        totalReps: 30 // 3x10
      })

      expect(result).toEqual({
        weight: 125,
        stage: 1,
        sets: 3,
        reps: 10,
        progression: '+5lbs'
      })
    })

    it('should move to stage 2 when not meeting volume target', () => {
      const result = calculateNextWorkout({
        exercise: 'squat',
        tier: 2,
        currentWeight: 180,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 8,
        totalReps: 28 // Less than 30 minimum
      })

      expect(result).toEqual({
        weight: 180,
        stage: 2,
        sets: 3,
        reps: 8,
        progression: 'Stage 2'
      })
    })

    it('should progress from stage 2 when meeting reduced volume', () => {
      const result = calculateNextWorkout({
        exercise: 'deadlift',
        tier: 2,
        currentWeight: 225,
        currentStage: 2,
        allSetsCompleted: true,
        amrapReps: 8,
        totalReps: 24 // Meets stage 2 minimum
      })

      expect(result).toEqual({
        weight: 235,
        stage: 2,
        sets: 3,
        reps: 8,
        progression: '+10lbs'
      })
    })
  })

  describe('T3 Progression', () => {
    it('should increase weight by 5lbs when hitting 25+ on AMRAP', () => {
      const result = calculateNextWorkout({
        exercise: 'lat_pulldown',
        tier: 3,
        currentWeight: 100,
        currentStage: 1, // T3 doesn't really have stages
        allSetsCompleted: true,
        amrapReps: 26
      })

      expect(result).toEqual({
        weight: 105,
        stage: 1,
        sets: 3,
        reps: 15,
        progression: '+5lbs'
      })
    })

    it('should maintain weight when not hitting 25 on AMRAP', () => {
      const result = calculateNextWorkout({
        exercise: 'face_pulls',
        tier: 3,
        currentWeight: 40,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 20
      })

      expect(result).toEqual({
        weight: 40,
        stage: 1,
        sets: 3,
        reps: 15,
        progression: 'Same weight'
      })
    })

    it('should maintain weight even if sets not completed', () => {
      const result = calculateNextWorkout({
        exercise: 'curls',
        tier: 3,
        currentWeight: 30,
        currentStage: 1,
        allSetsCompleted: false,
        amrapReps: 12
      })

      expect(result).toEqual({
        weight: 30,
        stage: 1,
        sets: 3,
        reps: 15,
        progression: 'Same weight'
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle very light weights correctly', () => {
      const result = calculateNextWorkout({
        exercise: 'ohp',
        tier: 1,
        currentWeight: 45,
        currentStage: 3,
        allSetsCompleted: false,
        amrapReps: 0
      })

      expect(result).toEqual({
        weight: 41, // 90% of 45, rounded
        stage: 1,
        sets: 5,
        reps: 3,
        progression: 'Reset to 41lbs'
      })
    })

    it('should handle decimal weights by rounding', () => {
      const result = calculateNextWorkout({
        exercise: 'bench',
        tier: 1,
        currentWeight: 152.5,
        currentStage: 1,
        allSetsCompleted: true,
        amrapReps: 5
      })

      expect(result).toEqual({
        weight: 157.5,
        stage: 1,
        sets: 5,
        reps: 3,
        progression: '+5lbs'
      })
    })
  })
})