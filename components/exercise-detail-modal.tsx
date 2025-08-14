'use client'

import { useEffect } from 'react'
import type { Exercise, Set, User, UserSettings } from '@prisma/client'

interface ExerciseDetailModalProps {
  isOpen: boolean
  onClose: () => void
  exercise: Exercise & {
    sets: Set[]
  }
  workoutDate: Date
  user: User & {
    settings: UserSettings | null
  }
}

export function ExerciseDetailModal({ isOpen, onClose, exercise, workoutDate, user }: ExerciseDetailModalProps) {
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

  const completedSets = exercise.sets.filter(s => s.completed).length
  const totalSets = exercise.sets.length

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] rounded-2xl border-2 border-white/20 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-[#0a0a0a] border-b border-white/10 p-6 pb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className={`inline-block text-xs font-bold tracking-[1.5px] uppercase tier-${exercise.tier} px-3 py-1 rounded-full bg-white/5 border border-white/10`}>
                T{exercise.tier}
              </span>
              <h2 className="text-xl font-bold text-foreground">
                {exercise.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-lg border-2 border-white/10 bg-white/5 text-muted flex items-center justify-center cursor-pointer transition-all active:scale-90"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-muted">
            Last time: {formatDate(workoutDate)}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Weight and Summary */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5">
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
            <div className="bg-white/[0.02] rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Volume</span>
                <span className="text-foreground font-medium">
                  {exercise.sets.reduce((sum, set) => 
                    sum + (set.completed ? set.completedReps * exercise.weight : 0), 0
                  ).toFixed(0)} {user.settings?.unit || 'lbs'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Total Reps</span>
                <span className="text-foreground font-medium">
                  {exercise.sets.reduce((sum, set) => 
                    sum + (set.completed ? set.completedReps : 0), 0
                  )}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}