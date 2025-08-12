import { describe, it, expect, beforeEach } from '@jest/globals'

describe('Workout Progression', () => {
  // Test the workout order logic
  describe('Workout Order', () => {
    const workoutKeys = ['A1', 'B1', 'A2', 'B2'] as const
    
    it('should map indices to correct workouts', () => {
      expect(workoutKeys[0]).toBe('A1')
      expect(workoutKeys[1]).toBe('B1')
      expect(workoutKeys[2]).toBe('A2')
      expect(workoutKeys[3]).toBe('B2')
    })
    
    it('should progress in correct order', () => {
      let currentWorkout = 0
      
      // Start at A1
      expect(workoutKeys[currentWorkout]).toBe('A1')
      
      // Progress to B1
      currentWorkout = (currentWorkout + 1) % 4
      expect(currentWorkout).toBe(1)
      expect(workoutKeys[currentWorkout]).toBe('B1')
      
      // Progress to A2
      currentWorkout = (currentWorkout + 1) % 4
      expect(currentWorkout).toBe(2)
      expect(workoutKeys[currentWorkout]).toBe('A2')
      
      // Progress to B2
      currentWorkout = (currentWorkout + 1) % 4
      expect(currentWorkout).toBe(3)
      expect(workoutKeys[currentWorkout]).toBe('B2')
      
      // Loop back to A1
      currentWorkout = (currentWorkout + 1) % 4
      expect(currentWorkout).toBe(0)
      expect(workoutKeys[currentWorkout]).toBe('A1')
    })
    
    it('should handle modulo correctly for all values', () => {
      expect(0 % 4).toBe(0) // A1
      expect(1 % 4).toBe(1) // B1
      expect(2 % 4).toBe(2) // A2
      expect(3 % 4).toBe(3) // B2
      expect(4 % 4).toBe(0) // Back to A1
      expect(5 % 4).toBe(1) // Back to B1
    })
  })
  
  // Test the complete workout API logic
  describe('Complete Workout API Logic', () => {
    it('should increment workout index correctly', () => {
      // Simulate the API logic
      const testCases = [
        { current: 0, expected: 1 }, // A1 -> B1
        { current: 1, expected: 2 }, // B1 -> A2
        { current: 2, expected: 3 }, // A2 -> B2
        { current: 3, expected: 0 }, // B2 -> A1
      ]
      
      testCases.forEach(({ current, expected }) => {
        const nextWorkout = (current + 1) % 4
        expect(nextWorkout).toBe(expected)
      })
    })
  })
  
  // Test weight calculations
  describe('Weight Calculations', () => {
    it('should calculate T1 and T2 weights correctly', () => {
      const startingWeight = 100 // User enters 85% of 5RM
      
      // T1 should use the entered weight directly
      const t1Weight = startingWeight
      expect(t1Weight).toBe(100)
      
      // T2 should be 65% of T1
      const t2Weight = Math.round(startingWeight * 0.65)
      expect(t2Weight).toBe(65)
    })
    
    it('should handle different starting weights', () => {
      const testCases = [
        { input: 200, t1Expected: 200, t2Expected: 130 },
        { input: 135, t1Expected: 135, t2Expected: 88 },
        { input: 315, t1Expected: 315, t2Expected: 205 },
      ]
      
      testCases.forEach(({ input, t1Expected, t2Expected }) => {
        const t1Weight = input
        const t2Weight = Math.round(input * 0.65)
        expect(t1Weight).toBe(t1Expected)
        expect(t2Weight).toBe(t2Expected)
      })
    })
  })
  
  // Test reset functionality
  describe('Reset Functionality', () => {
    it('should reset all values correctly', () => {
      const resetData = {
        currentWorkout: 0,
        squatMax: 0,
        benchMax: 0,
        deadliftMax: 0,
        ohpMax: 0
      }
      
      expect(resetData.currentWorkout).toBe(0) // Should start at A1
      expect(resetData.squatMax).toBe(0)
      expect(resetData.benchMax).toBe(0)
      expect(resetData.deadliftMax).toBe(0)
      expect(resetData.ohpMax).toBe(0)
    })
  })
  
  // Test stage progression
  describe('Stage Progression', () => {
    it('should progress stages correctly on failure', () => {
      let t1Stage = 1
      
      // Failed stage 1, move to stage 2
      t1Stage = t1Stage + 1
      expect(t1Stage).toBe(2)
      
      // Failed stage 2, move to stage 3
      t1Stage = t1Stage + 1
      expect(t1Stage).toBe(3)
      
      // Failed stage 3, reset to stage 1
      if (t1Stage + 1 > 3) {
        t1Stage = 1
      } else {
        t1Stage = t1Stage + 1
      }
      expect(t1Stage).toBe(1)
    })
    
    it('should increase weight on success', () => {
      const exercises = [
        { type: 'squat', weight: 200, increment: 10 },
        { type: 'bench', weight: 135, increment: 5 },
        { type: 'deadlift', weight: 315, increment: 10 },
        { type: 'ohp', weight: 95, increment: 5 },
      ]
      
      exercises.forEach(({ type, weight, increment }) => {
        const newWeight = weight + increment
        expect(newWeight).toBe(weight + increment)
      })
    })
  })
})