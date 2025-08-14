'use client'

import { useEffect } from 'react'
import type { Workout, Exercise, Set, User, UserSettings } from '@prisma/client'

interface WorkoutDetailModalProps {
  isOpen: boolean
  onClose: () => void
  workout: Workout & {
    exercises: (Exercise & {
      sets: Set[]
    })[]
  }
  user: User & {
    settings: UserSettings | null
  }
}

export function WorkoutDetailModal({ isOpen, onClose, workout, user }: WorkoutDetailModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg max-h-[90vh] bg-[#0a0a0a] rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0a0a] border-b border-white/10 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-foreground">
              Workout {workout.workoutType}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg border-2 border-white/10 bg-white/5 text-muted flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-muted">
            {formatDate(workout.completedAt)} at {formatTime(workout.completedAt)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {workout.exercises.map((exercise) => {
            const completedSets = exercise.sets.filter(s => s.completed).length
            const totalSets = exercise.sets.length
            
            return (
              <div key={exercise.id} className="space-y-3">
                {/* Exercise Header */}
                <div className="flex items-center gap-3">
                  <span className={`inline-block text-xs font-bold tracking-[1.5px] uppercase tier-${exercise.tier} px-3 py-1 rounded-full bg-white/5 border border-white/10`}>
                    T{exercise.tier}
                  </span>
                  <h3 className="text-lg font-bold text-foreground">
                    {exercise.name}
                  </h3>
                </div>

                {/* Weight and Summary */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
                  <span className="text-2xl font-bold text-foreground">
                    {exercise.weight} {user.settings?.unit || 'lbs'}
                  </span>
                  <span className="text-sm text-muted">
                    {completedSets}/{totalSets} sets completed
                  </span>
                </div>

                {/* Sets Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {exercise.sets.map((set) => (
                    <div
                      key={set.id}
                      className={`
                        px-3 py-4 rounded-lg text-center
                        ${set.completed 
                          ? 'bg-white text-black font-bold shadow-lg shadow-white/10' 
                          : 'border-2 border-white/10 bg-white/5 text-muted'
                        }
                      `}
                    >
                      <div className="text-[11px] uppercase tracking-[1px] mb-1 opacity-80">
                        Set {set.setNumber}
                      </div>
                      <div className="text-base font-semibold">
                        {set.completed ? (
                          <>× {set.completedReps}</>
                        ) : (
                          <span className="opacity-50">× {set.targetReps}</span>
                        )}
                      </div>
                      {set.isAmrap && (
                        <div className="text-[10px] uppercase tracking-wider mt-1 opacity-60">
                          AMRAP
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Exercise Stats */}
                {completedSets > 0 && (
                  <div className="flex items-center justify-between text-sm text-muted px-1">
                    <span>
                      Total Volume: {exercise.sets.reduce((sum, set) => 
                        sum + (set.completed ? set.completedReps * exercise.weight : 0), 0
                      ).toFixed(0)} {user.settings?.unit || 'lbs'}
                    </span>
                    <span>
                      Total Reps: {exercise.sets.reduce((sum, set) => 
                        sum + (set.completed ? set.completedReps : 0), 0
                      )}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer Stats */}
        <div className="sticky bottom-0 bg-[#0a0a0a] border-t border-white/10 p-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-foreground">
                {workout.exercises.reduce((sum, ex) => 
                  sum + ex.sets.filter(s => s.completed).length, 0
                )}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted">
                Total Sets
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {workout.exercises.reduce((sum, ex) => 
                  sum + ex.sets.reduce((setSum, set) => 
                    setSum + (set.completed ? set.completedReps * ex.weight : 0), 0
                  ), 0
                ).toFixed(0)}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted">
                Total Volume ({user.settings?.unit || 'lbs'})
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}