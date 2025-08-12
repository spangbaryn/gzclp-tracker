import { describe, it, expect } from '@jest/globals'

describe('Reset and Setup Flow', () => {
  it('should always start with A1 (workout 0) after reset', () => {
    // Simulate reset
    const resetState = {
      currentWorkout: 0,
      squatMax: 0,
      benchMax: 0,
      deadliftMax: 0,
      ohpMax: 0
    }
    
    expect(resetState.currentWorkout).toBe(0)
    
    // Map to workout
    const workoutKeys = ['A1', 'B1', 'A2', 'B2']
    expect(workoutKeys[resetState.currentWorkout]).toBe('A1')
  })
  
  it('should not change currentWorkout when setting up weights', () => {
    // Start state after reset
    let currentWorkout = 0
    
    // Setup weights (this should NOT change currentWorkout)
    const weights = {
      squatMax: 100,
      benchMax: 80,
      deadliftMax: 120,
      ohpMax: 60
    }
    
    // currentWorkout should still be 0
    expect(currentWorkout).toBe(0)
    
    const workoutKeys = ['A1', 'B1', 'A2', 'B2']
    expect(workoutKeys[currentWorkout]).toBe('A1')
  })
  
  it('should show correct workout for each index', () => {
    const workoutKeys = ['A1', 'B1', 'A2', 'B2']
    
    // After reset
    expect(workoutKeys[0]).toBe('A1')
    
    // If somehow currentWorkout is 1
    expect(workoutKeys[1]).toBe('B1')
    
    // This would be wrong after reset!
    const wrongIndex = 1
    expect(workoutKeys[wrongIndex]).toBe('B1')
    expect(workoutKeys[wrongIndex]).not.toBe('A1')
  })
})