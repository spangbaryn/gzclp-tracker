import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ExerciseCard } from '@/components/exercise-card'
import type { ExerciseData } from '@/components/workout-view'

describe('AMRAP Set Completion', () => {
  const mockOnToggleSet = jest.fn()
  const mockOnUpdateAmrapReps = jest.fn()
  const mockOnAdjustWeight = jest.fn()
  const mockOnSetWeight = jest.fn()

  const mockExercise: ExerciseData = {
    name: 'Squat',
    tier: 1,
    type: 'squat',
    weight: 225,
    stage: 'Stage 1',
    sets: [
      { reps: 3, completed: true, isAmrap: false },
      { reps: 3, completed: true, isAmrap: false },
      { reps: 3, completed: true, isAmrap: false },
      { reps: 3, completed: true, isAmrap: false },
      { reps: 3, completed: false, isAmrap: true } // Last AMRAP set
    ]
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show number pad modal when clicking uncompleted AMRAP set', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        exerciseIndex={0}
        unit="lbs"
        onToggleSet={mockOnToggleSet}
        onUpdateAmrapReps={mockOnUpdateAmrapReps}
        onAdjustWeight={mockOnAdjustWeight}
        onSetWeight={mockOnSetWeight}
      />
    )

    // Find the AMRAP button (last set)
    const amrapButton = screen.getByText('AMRAP')
    fireEvent.click(amrapButton)

    // Should show the modal
    expect(screen.getByText('AMRAP Reps')).toBeInTheDocument()
    
    // Should NOT have toggled the set yet
    expect(mockOnToggleSet).not.toHaveBeenCalled()
  })

  it('should mark set as completed after saving AMRAP reps', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        exerciseIndex={0}
        unit="lbs"
        onToggleSet={mockOnToggleSet}
        onUpdateAmrapReps={mockOnUpdateAmrapReps}
        onAdjustWeight={mockOnAdjustWeight}
        onSetWeight={mockOnSetWeight}
      />
    )

    // Click AMRAP set
    const amrapButton = screen.getByText('AMRAP')
    fireEvent.click(amrapButton)

    // Enter some reps and save
    const saveButton = screen.getByText('Save')
    fireEvent.click(saveButton)

    // Should have updated reps and marked as completed
    expect(mockOnUpdateAmrapReps).toHaveBeenCalledWith(0, 4, expect.any(Number))
    expect(mockOnToggleSet).toHaveBeenCalledWith(0, 4)
  })

  it('should not mark set as completed when canceling AMRAP modal', () => {
    render(
      <ExerciseCard
        exercise={mockExercise}
        exerciseIndex={0}
        unit="lbs"
        onToggleSet={mockOnToggleSet}
        onUpdateAmrapReps={mockOnUpdateAmrapReps}
        onAdjustWeight={mockOnAdjustWeight}
        onSetWeight={mockOnSetWeight}
      />
    )

    // Click AMRAP set
    const amrapButton = screen.getByText('AMRAP')
    fireEvent.click(amrapButton)

    // Click cancel/close
    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    // Should NOT have toggled the set or updated reps
    expect(mockOnToggleSet).not.toHaveBeenCalled()
    expect(mockOnUpdateAmrapReps).not.toHaveBeenCalled()
  })

  it('should toggle completed AMRAP sets normally without showing modal', () => {
    const completedAmrapExercise = {
      ...mockExercise,
      sets: [
        ...mockExercise.sets.slice(0, 4),
        { reps: 5, completed: true, isAmrap: true } // Already completed AMRAP
      ]
    }

    render(
      <ExerciseCard
        exercise={completedAmrapExercise}
        exerciseIndex={0}
        unit="lbs"
        onToggleSet={mockOnToggleSet}
        onUpdateAmrapReps={mockOnUpdateAmrapReps}
        onAdjustWeight={mockOnAdjustWeight}
        onSetWeight={mockOnSetWeight}
      />
    )

    // Click the completed AMRAP set (shows × 5)
    const completedAmrapButton = screen.getByText('× 5')
    fireEvent.click(completedAmrapButton)

    // Should toggle directly without showing modal
    expect(mockOnToggleSet).toHaveBeenCalledWith(0, 4)
    expect(screen.queryByText('AMRAP Reps')).not.toBeInTheDocument()
  })
})