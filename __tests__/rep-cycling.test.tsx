import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExerciseCard } from '@/components/exercise-card'
import type { ExerciseData } from '@/components/workout-view'

describe('Rep Cycling', () => {
  const mockExercise: ExerciseData = {
    name: 'Squat',
    tier: 1,
    type: 'squat',
    weight: 135,
    sets: [
      { reps: 5, completed: false, isAmrap: false },
      { reps: 5, completed: false, isAmrap: false },
      { reps: 5, completed: false, isAmrap: false },
      { reps: 5, completed: false, isAmrap: true }
    ],
    stage: 'Stage 1'
  }

  const mockProps = {
    exercise: mockExercise,
    exerciseIndex: 0,
    unit: 'lbs',
    onAdjustWeight: jest.fn(),
    onToggleSet: jest.fn(),
    onUpdateAmrapReps: jest.fn(),
    onSetWeight: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should mark set as completed on first tap', () => {
    render(<ExerciseCard {...mockProps} />)
    
    const firstSet = screen.getByText('1').closest('button')
    fireEvent.click(firstSet!)
    
    expect(mockProps.onToggleSet).toHaveBeenCalledWith(0, 0)
  })

  it('should cycle reps from 5 → 4 → 3 → 2 → 1 → uncompleted for non-AMRAP sets', () => {
    const { rerender } = render(<ExerciseCard {...mockProps} />)
    
    // First tap: complete with 5 reps (no currentReps set)
    const firstSet = screen.getByText('1').closest('button')
    fireEvent.click(firstSet!)
    
    // Simulate the set being marked as completed (currentReps undefined)
    const completedExercise = {
      ...mockExercise,
      sets: [
        { reps: 5, completed: true, isAmrap: false },
        ...mockExercise.sets.slice(1)
      ]
    }
    rerender(<ExerciseCard {...mockProps} exercise={completedExercise} />)
    
    // Should still show × 5 after first tap
    expect(screen.getAllByText('× 5')[0]).toBeInTheDocument()
    
    // Second tap: should show 4 reps
    fireEvent.click(firstSet!)
    expect(mockProps.onToggleSet).toHaveBeenCalledTimes(2)
    
    // Continue cycling through reps
    const repSequence = [
      { currentReps: 4, completed: true, display: '× 4' },
      { currentReps: 3, completed: true, display: '× 3' },
      { currentReps: 2, completed: true, display: '× 2' },
      { currentReps: 1, completed: true, display: '× 1' }
    ]
    
    repSequence.forEach(({ currentReps, completed, display }) => {
      const exerciseWithReps = {
        ...mockExercise,
        sets: [
          { reps: 5, currentReps, completed, isAmrap: false },
          ...mockExercise.sets.slice(1)
        ]
      }
      rerender(<ExerciseCard {...mockProps} exercise={exerciseWithReps} />)
      
      // Verify the displayed reps
      const displayedReps = screen.getAllByText(display)[0]
      expect(displayedReps).toBeInTheDocument()
    })
    
    // After showing 1 rep, next tap should revert to uncompleted
    fireEvent.click(firstSet!)
    
    // Simulate reverting to uncompleted state
    const uncompletedExercise = {
      ...mockExercise,
      sets: [
        { reps: 5, completed: false, isAmrap: false },
        ...mockExercise.sets.slice(1)
      ]
    }
    rerender(<ExerciseCard {...mockProps} exercise={uncompletedExercise} />)
    
    // Should show original reps without completed styling
    expect(screen.getAllByText('× 5')[0]).toBeInTheDocument()
    // The button should not have the completed class
    const button = screen.getByText('1').closest('button')
    expect(button).not.toHaveClass('bg-white')
  })

  it('should not cycle reps for AMRAP sets', async () => {
    render(<ExerciseCard {...mockProps} />)
    
    // Find the AMRAP set (last one)
    const amrapSet = screen.getByText('AMRAP').closest('button')
    fireEvent.click(amrapSet!)
    
    // Should open modal instead of toggling
    await waitFor(() => {
      expect(screen.getByText('AMRAP Reps')).toBeInTheDocument()
    })
    
    // The modal will have the initial value of 5 reps
    // Just click save to accept default
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)
    
    expect(mockProps.onUpdateAmrapReps).toHaveBeenCalledWith(0, 3, 5)
    expect(mockProps.onToggleSet).toHaveBeenCalledWith(0, 3)
  })

  it('should maintain separate rep counts for each set', () => {
    const { rerender } = render(<ExerciseCard {...mockProps} />)
    
    // Complete first set
    const firstSet = screen.getByText('1').closest('button')
    fireEvent.click(firstSet!)
    
    // Complete second set
    const secondSet = screen.getByText('2').closest('button')
    fireEvent.click(secondSet!)
    
    // Update exercise to show both sets completed
    const updatedExercise = {
      ...mockExercise,
      sets: [
        { reps: 5, completed: true, isAmrap: false },
        { reps: 5, completed: true, isAmrap: false },
        { reps: 5, completed: false, isAmrap: false },
        { reps: 5, completed: false, isAmrap: true }
      ]
    }
    rerender(<ExerciseCard {...mockProps} exercise={updatedExercise} />)
    
    // Tap first set again - should cycle to 4
    fireEvent.click(firstSet!)
    
    // Tap second set again - should also cycle to 4
    fireEvent.click(secondSet!)
    
    // Both should have been toggled independently
    expect(mockProps.onToggleSet).toHaveBeenCalledWith(0, 0)
    expect(mockProps.onToggleSet).toHaveBeenCalledWith(0, 1)
  })

  it('should show current rep count instead of target reps when completed', () => {
    const exerciseWithVariedReps = {
      ...mockExercise,
      sets: [
        { reps: 5, currentReps: 3, completed: true, isAmrap: false },  // Cycled down to 3
        { reps: 5, completed: true, isAmrap: false },  // Still at original 5 (no currentReps)
        { reps: 5, currentReps: 1, completed: true, isAmrap: false },  // Cycled down to 1
        { reps: 5, completed: false, isAmrap: true }   // AMRAP not completed
      ]
    }
    
    render(<ExerciseCard {...mockProps} exercise={exerciseWithVariedReps} />)
    
    // Check that completed sets show their current rep count
    const repDisplays = screen.getAllByText(/× \d+/)
    expect(repDisplays[0]).toHaveTextContent('× 3')
    expect(repDisplays[1]).toHaveTextContent('× 5')
    expect(repDisplays[2]).toHaveTextContent('× 1')
  })
})