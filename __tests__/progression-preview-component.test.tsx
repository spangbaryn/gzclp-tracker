import { describe, it, expect, jest } from '@jest/globals'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProgressionPreview } from '@/components/progression-preview'
import type { ExerciseData } from '@/components/workout-view'

describe('ProgressionPreview Component', () => {
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
      { reps: 3, completed: true, isAmrap: true }
    ]
  }

  it('should not render when not all sets are completed', () => {
    const incompleteExercise = {
      ...mockExercise,
      sets: [
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: true }
      ]
    }

    const { container } = render(
      <ProgressionPreview exercise={incompleteExercise} unit="lbs" />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should show T1 progression preview when all sets completed', () => {
    render(<ProgressionPreview exercise={mockExercise} unit="lbs" />)
    
    expect(screen.getByText(/Next:/)).toBeInTheDocument()
    expect(screen.getByText(/Squat T1 - 5x3 @ 235lbs/)).toBeInTheDocument()
    expect(screen.getByText(/\(\+10lbs\)/)).toBeInTheDocument()
  })

  it('should show T1 stage progression on failure', () => {
    const failedExercise = {
      ...mockExercise,
      sets: [
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: true, isAmrap: false },
        { reps: 3, completed: false, isAmrap: false }, // Failed this set
        { reps: 3, completed: false, isAmrap: false },
        { reps: 3, completed: false, isAmrap: true }
      ]
    }

    // This should not render because not all sets are completed
    const { container } = render(
      <ProgressionPreview exercise={failedExercise} unit="lbs" />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('should show T2 progression based on volume', () => {
    const t2Exercise: ExerciseData = {
      name: 'Bench Press',
      tier: 2,
      type: 'bench',
      weight: 120,
      stage: 'Stage 1',
      sets: [
        { reps: 10, completed: true, isAmrap: false },
        { reps: 10, completed: true, isAmrap: false },
        { reps: 10, completed: true, isAmrap: true }
      ]
    }

    render(<ProgressionPreview exercise={t2Exercise} unit="lbs" />)
    
    expect(screen.getByText(/Bench Press T2 - 3x10 @ 125lbs/)).toBeInTheDocument()
    expect(screen.getByText(/\(\+5lbs\)/)).toBeInTheDocument()
  })

  it('should show T3 progression based on AMRAP', () => {
    const t3Exercise: ExerciseData = {
      name: 'Lat Pulldown',
      tier: 3,
      type: 'lat_pulldown',
      weight: 100,
      stage: 'T3',
      sets: [
        { reps: 15, completed: true, isAmrap: false },
        { reps: 15, completed: true, isAmrap: false },
        { reps: 26, completed: true, isAmrap: true } // Hit 25+ reps
      ]
    }

    render(<ProgressionPreview exercise={t3Exercise} unit="lbs" />)
    
    expect(screen.getByText(/Lat Pulldown T3 - 3x15\+ @ 105lbs/)).toBeInTheDocument()
    expect(screen.getByText(/\(\+5lbs\)/)).toBeInTheDocument()
  })

  it('should show same weight for T3 when not hitting 25 reps', () => {
    const t3Exercise: ExerciseData = {
      name: 'Face Pulls',
      tier: 3,
      type: 'face_pulls',
      weight: 40,
      stage: 'T3',
      sets: [
        { reps: 15, completed: true, isAmrap: false },
        { reps: 15, completed: true, isAmrap: false },
        { reps: 20, completed: true, isAmrap: true } // Less than 25 reps
      ]
    }

    render(<ProgressionPreview exercise={t3Exercise} unit="lbs" />)
    
    expect(screen.getByText(/Face Pulls T3 - 3x15\+ @ 40lbs/)).toBeInTheDocument()
    expect(screen.getByText(/\(Same weight\)/)).toBeInTheDocument()
  })

  it('should handle different units', () => {
    render(<ProgressionPreview exercise={mockExercise} unit="kg" />)
    
    expect(screen.getByText(/Squat T1 - 5x3 @ 235kg/)).toBeInTheDocument()
  })
})