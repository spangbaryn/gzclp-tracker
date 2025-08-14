'use client'

import { useState } from 'react'
import { WorkoutDetailModal } from './workout-detail-modal'
import type { Workout, Exercise, Set, User, UserSettings } from '@prisma/client'

interface HistoryListProps {
  workoutHistory: (Workout & {
    exercises: (Exercise & {
      sets: Set[]
    })[]
  })[]
  user: User & {
    settings: UserSettings | null
  }
}

export function HistoryList({ workoutHistory, user }: HistoryListProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<typeof workoutHistory[0] | null>(null)

  if (workoutHistory.length === 0) {
    return (
      <div className="glass rounded-lg p-6 text-center text-muted">
        No workout history yet
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {workoutHistory.map((workout) => {
          const date = new Date(workout.completedAt)
          const dateStr = date.toLocaleDateString() + ' ' + 
            date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
          
          return (
            <div 
              key={workout.id} 
              onClick={() => setSelectedWorkout(workout)}
              className="glass glass-gradient rounded-lg p-5 cursor-pointer transition-all active:scale-[0.99]"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="text-lg font-bold text-foreground tracking-[0.5px]">
                  {workout.workoutType}
                </div>
                <div className="text-xs text-muted uppercase tracking-[1px]">
                  {dateStr}
                </div>
              </div>
              <div className="space-y-1">
                {workout.exercises.map((ex) => {
                  const completedSets = ex.sets.filter(s => s.completed).length
                  const totalReps = ex.sets.reduce((sum, set) => sum + (set.completed ? set.completedReps : 0), 0)
                  return (
                    <div key={ex.id} className="flex justify-between text-sm py-1">
                      <span className="text-muted">{ex.name}</span>
                      <span className="text-foreground font-medium">
                        {ex.weight}{user.settings?.unit || 'lbs'} × {completedSets} sets ({totalReps} reps)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {selectedWorkout && (
        <WorkoutDetailModal
          isOpen={!!selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          workout={selectedWorkout}
          user={user}
        />
      )}
    </>
  )
}