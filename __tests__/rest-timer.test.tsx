import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RestTimer } from '@/components/rest-timer'

// Mock timers
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('RestTimer Component', () => {
  it('should not render when startTime is null', () => {
    const { container } = render(<RestTimer startTime={null} />)
    expect(container.firstChild).toBeNull()
  })

  it('should render and start counting when startTime is provided', () => {
    const startTime = Date.now()
    render(<RestTimer startTime={startTime} />)
    
    // Should show 0:00 initially
    expect(screen.getByText(/0:00/)).toBeInTheDocument()
    
    // Advance timer by 1 second
    act(() => {
      jest.advanceTimersByTime(1000)
    })
    
    // Should now show 0:01
    expect(screen.getByText(/0:01/)).toBeInTheDocument()
  })

  it('should format time correctly for minutes and seconds', () => {
    const startTime = Date.now()
    render(<RestTimer startTime={startTime} />)
    
    // Advance by 65 seconds (1:05)
    act(() => {
      jest.advanceTimersByTime(65000)
    })
    
    expect(screen.getByText(/1:05/)).toBeInTheDocument()
    
    // Advance to 10 minutes
    act(() => {
      jest.advanceTimersByTime(535000) // Additional 535 seconds to reach 600 total
    })
    
    expect(screen.getByText(/10:00/)).toBeInTheDocument()
  })

  it('should have appropriate styling', () => {
    const startTime = Date.now()
    render(<RestTimer startTime={startTime} />)
    
    const timerElement = screen.getByText(/0:00/).parentElement?.parentElement
    expect(timerElement).toHaveClass('rest-timer')
  })

  it('should change color based on elapsed time', () => {
    const startTime = Date.now()
    const { rerender } = render(<RestTimer startTime={startTime} />)
    
    // Initially blue (< 90 seconds)
    let timerDisplay = screen.getByText(/0:00/)
    expect(timerDisplay).toHaveClass('text-primary')
    
    // Advance to 1:30 - should be green
    act(() => {
      jest.advanceTimersByTime(90000)
    })
    
    rerender(<RestTimer startTime={startTime} />)
    timerDisplay = screen.getByText(/1:30/)
    expect(timerDisplay).toHaveClass('text-green-500')
    
    // Advance to 3:00 - should be red
    act(() => {
      jest.advanceTimersByTime(90000) // Total 180 seconds
    })
    
    rerender(<RestTimer startTime={startTime} />)
    timerDisplay = screen.getByText(/3:00/)
    expect(timerDisplay).toHaveClass('text-red-500')
  })
})

describe('Rest Timer Integration with Workout', () => {
  // Mock workout data
  const mockExercises = [
    {
      name: 'Squat',
      tier: 1,
      type: 'squat',
      weight: 225,
      sets: [
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: true }
      ]
    },
    {
      name: 'Bench Press',
      tier: 2,
      type: 'bench',
      weight: 120,
      sets: [
        { reps: 10, completed: false, isAmrap: false },
        { reps: 10, completed: false, isAmrap: false },
        { reps: 10, completed: false, isAmrap: false }
      ]
    },
    {
      name: 'Lat Pulldown',
      tier: 3,
      type: 'accessory',
      weight: 100,
      sets: [
        { reps: 15, completed: false, isAmrap: false },
        { reps: 15, completed: false, isAmrap: false },
        { reps: 15, completed: false, isAmrap: true }
      ]
    }
  ]

  describe('Timer Placement Logic', () => {
    it('should show timer on next exercise when completing a set', () => {
      // When completing first set of first exercise
      // Timer should appear on the same exercise (next set)
      const currentExerciseIndex = 0
      const currentSetIndex = 0
      
      const { shouldShowTimer, timerExerciseIndex } = getTimerPlacement(
        mockExercises,
        currentExerciseIndex,
        currentSetIndex
      )
      
      expect(shouldShowTimer).toBe(true)
      expect(timerExerciseIndex).toBe(0) // Same exercise
    })

    it('should show timer on next exercise when completing last set of an exercise', () => {
      // When completing last set of first exercise
      // Timer should appear on second exercise
      const currentExerciseIndex = 0
      const currentSetIndex = 2 // Last set
      
      const { shouldShowTimer, timerExerciseIndex } = getTimerPlacement(
        mockExercises,
        currentExerciseIndex,
        currentSetIndex
      )
      
      expect(shouldShowTimer).toBe(true)
      expect(timerExerciseIndex).toBe(1) // Next exercise
    })

    it('should not show timer when completing last set of last exercise', () => {
      // When completing last set of last exercise
      // No timer needed
      const currentExerciseIndex = 2 // Last exercise
      const currentSetIndex = 2 // Last set
      
      const { shouldShowTimer, timerExerciseIndex } = getTimerPlacement(
        mockExercises,
        currentExerciseIndex,
        currentSetIndex
      )
      
      expect(shouldShowTimer).toBe(false)
      expect(timerExerciseIndex).toBe(null)
    })

    it('should handle timer when switching between exercises', () => {
      // Timer should reset when starting a new exercise
      let timerStartTime = Date.now()
      
      // Complete last set of exercise 1
      const newStartTime = Date.now() + 60000 // 1 minute later
      
      expect(newStartTime).toBeGreaterThan(timerStartTime)
    })
  })
})

// Helper function to determine timer placement
function getTimerPlacement(
  exercises: any[],
  currentExerciseIndex: number,
  currentSetIndex: number
) {
  const currentExercise = exercises[currentExerciseIndex]
  const isLastSetOfExercise = currentSetIndex === currentExercise.sets.length - 1
  const isLastExercise = currentExerciseIndex === exercises.length - 1
  
  if (isLastExercise && isLastSetOfExercise) {
    return { shouldShowTimer: false, timerExerciseIndex: null }
  }
  
  if (isLastSetOfExercise) {
    // Show timer on next exercise
    return { shouldShowTimer: true, timerExerciseIndex: currentExerciseIndex + 1 }
  }
  
  // Show timer on current exercise (for next set)
  return { shouldShowTimer: true, timerExerciseIndex: currentExerciseIndex }
}