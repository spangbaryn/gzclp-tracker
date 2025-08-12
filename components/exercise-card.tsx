'use client'

import { useState } from 'react'
import type { ExerciseData } from './workout-view'
import { NumberPadModal } from './number-pad-modal'

interface ExerciseCardProps {
  exercise: ExerciseData
  exerciseIndex: number
  unit: string
  onAdjustWeight: (exerciseIndex: number, amount: number) => void
  onToggleSet: (exerciseIndex: number, setIndex: number) => void
  onUpdateAmrapReps: (exerciseIndex: number, setIndex: number, value: number) => void
  onSetWeight: (exerciseIndex: number, weight: number) => void
}

export function ExerciseCard({
  exercise,
  exerciseIndex,
  unit,
  onAdjustWeight,
  onToggleSet,
  onUpdateAmrapReps,
  onSetWeight
}: ExerciseCardProps) {
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showAmrapModal, setShowAmrapModal] = useState(false)
  const [amrapSetIndex, setAmrapSetIndex] = useState<number | null>(null)
  const tierClass = `tier-${exercise.tier}`
  const tierName = exercise.tier === 1 ? 'T1' : exercise.tier === 2 ? 'T2' : 'T3'
  
  const handleSetClick = (setIndex: number) => {
    const set = exercise.sets[setIndex]
    if (set.isAmrap && !set.completed) {
      // Mark as completed first
      onToggleSet(exerciseIndex, setIndex)
      // Then show modal for reps
      setTimeout(() => {
        setAmrapSetIndex(setIndex)
        setShowAmrapModal(true)
      }, 100)
    } else {
      onToggleSet(exerciseIndex, setIndex)
    }
  }
  
  return (
    <div className="glass glass-gradient rounded-lg p-6 mb-4 transition-all hover:bg-white/[0.04]">
      <div className="flex items-center gap-3 mb-4">
        <span className={`inline-block text-xs font-bold tracking-[1.5px] uppercase ${tierClass} px-3 py-1 rounded-full bg-white/5 border border-white/10`}>
          {tierName}
        </span>
        {exercise.stage && (
          <span className="text-xs font-semibold tracking-[1px] uppercase text-muted">
            {exercise.stage}
          </span>
        )}
      </div>
      
      <div className="text-xl font-bold text-foreground mb-6 tracking-[0.5px]">
        {exercise.name}
      </div>
      
      <div className="flex items-center justify-between p-4 rounded-lg bg-white/[0.02] border border-white/5 mb-6">
        <button
          onClick={() => setShowWeightModal(true)}
          className="text-2xl font-bold text-foreground tracking-[1px] hover:text-white transition-colors cursor-pointer"
        >
          {exercise.weight} {unit}
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => onAdjustWeight(exerciseIndex, -5)}
            className="w-11 h-11 rounded-lg border-2 border-white/10 bg-white/5 text-[#a8a8a8] text-xl font-normal cursor-pointer transition-all hover:border-white/20 hover:text-foreground hover:bg-white/10 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-95"
          >
            −
          </button>
          <button
            onClick={() => onAdjustWeight(exerciseIndex, 5)}
            className="w-11 h-11 rounded-lg border-2 border-white/10 bg-white/5 text-[#a8a8a8] text-xl font-normal cursor-pointer transition-all hover:border-white/20 hover:text-foreground hover:bg-white/10 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-95"
          >
            +
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
        {exercise.sets.map((set, setIndex) => (
          <button
            key={setIndex}
            onClick={() => handleSetClick(setIndex)}
            className={`
              px-[10px] py-[14px] rounded-lg text-center cursor-pointer transition-all min-h-[60px]
              focus:outline-2 focus:outline-ring focus:-outline-offset-2
              ${set.completed 
                ? 'bg-foreground text-background font-bold shadow-lg shadow-white/10' 
                : set.isAmrap 
                  ? 'border-2 border-white/20 bg-gradient-to-br from-white/10 to-white/5 hover:border-white/30 hover:from-white/15 hover:to-white/10' 
                  : 'border-2 border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
              }
              ${!set.completed ? 'active:scale-95' : ''}
            `}
          >
            <div className="text-[11px] uppercase tracking-[1px] mb-1 opacity-80">
              {setIndex + 1}
            </div>
            <div className="text-base font-semibold">
              {set.isAmrap && set.completed 
                ? `× ${set.reps}` 
                : set.isAmrap 
                  ? 'AMRAP' 
                  : `× ${set.reps}`
              }
            </div>
          </button>
        ))}
      </div>
      
      {exercise.tier <= 2 && (
        <div className="rounded-lg bg-gradient-to-r from-white/5 to-transparent border-l-[3px] border-white/30 pl-4 py-3 mt-6 text-xs uppercase tracking-[1px] text-muted font-semibold">
          Next: +{exercise.type === 'bench' || exercise.type === 'ohp' ? '5' : '10'} {unit}
        </div>
      )}
      
      <NumberPadModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSave={(weight) => onSetWeight(exerciseIndex, weight)}
        initialValue={exercise.weight}
        title={`${exercise.name} Weight`}
        unit={unit}
      />
      
      {amrapSetIndex !== null && (
        <NumberPadModal
          isOpen={showAmrapModal}
          onClose={() => {
            setShowAmrapModal(false)
            setAmrapSetIndex(null)
          }}
          onSave={(reps) => {
            onUpdateAmrapReps(exerciseIndex, amrapSetIndex, reps)
            setShowAmrapModal(false)
            setAmrapSetIndex(null)
          }}
          initialValue={exercise.sets[amrapSetIndex].reps}
          title="AMRAP Reps"
          unit="reps"
        />
      )}
    </div>
  )
}