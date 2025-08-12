import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ExerciseCard } from '@/components/exercise-card'
import type { ExerciseData } from '@/components/workout-view'

describe('T1 AMRAP Functionality', () => {
  const mockT1Exercise: ExerciseData = {
    name: 'Squat',
    tier: 1,
    type: 'squat',
    weight: 135,
    stage: '5×3+',
    sets: [
      { reps: 3, completed: false, isAmrap: false },
      { reps: 3, completed: false, isAmrap: false },
      { reps: 3, completed: false, isAmrap: false },
      { reps: 3, completed: false, isAmrap: false },
      { reps: 3, completed: false, isAmrap: true }
    ]
  }

  const mockHandlers = {
    onAdjustWeight: jest.fn(),
    onToggleSet: jest.fn(),
    onUpdateAmrapReps: jest.fn(),
    onSetWeight: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show AMRAP modal when clicking last T1 set', async () => {
    render(
      <ExerciseCard
        exercise={mockT1Exercise}
        exerciseIndex={0}
        unit="lbs"
        {...mockHandlers}
      />
    )

    // Click the last set (AMRAP)
    const sets = screen.getAllByRole('button', { name: /×|AMRAP/i })
    const lastSet = sets[sets.length - 1]
    
    expect(lastSet).toHaveTextContent('AMRAP')
    fireEvent.click(lastSet)

    // Should show AMRAP modal
    await waitFor(() => {
      expect(screen.getByText('AMRAP Reps')).toBeInTheDocument()
    })

    // Should not call onToggleSet immediately
    expect(mockHandlers.onToggleSet).not.toHaveBeenCalled()
  })

  it('should update reps and mark T1 AMRAP set as completed', async () => {
    render(
      <ExerciseCard
        exercise={mockT1Exercise}
        exerciseIndex={0}
        unit="lbs"
        {...mockHandlers}
      />
    )

    // Click the AMRAP set
    const sets = screen.getAllByRole('button', { name: /×|AMRAP/i })
    const lastSet = sets[sets.length - 1]
    fireEvent.click(lastSet)

    // Wait for modal
    await waitFor(() => {
      expect(screen.getByText('AMRAP Reps')).toBeInTheDocument()
    })

    // Enter 5 reps
    const buttons = screen.getAllByRole('button')
    const fiveButton = buttons.find(btn => btn.textContent === '5')
    fireEvent.click(fiveButton!)

    // Save
    const saveButton = screen.getByRole('button', { name: /save/i })
    fireEvent.click(saveButton)

    // Should update reps and mark as completed
    expect(mockHandlers.onUpdateAmrapReps).toHaveBeenCalledWith(0, 4, 5)
    expect(mockHandlers.onToggleSet).toHaveBeenCalledWith(0, 4)
  })

  it('should display correct stage name for T1', () => {
    render(
      <ExerciseCard
        exercise={mockT1Exercise}
        exerciseIndex={0}
        unit="lbs"
        {...mockHandlers}
      />
    )

    expect(screen.getByText('5×3+')).toBeInTheDocument()
  })
})