'use client'

import { useState } from 'react'
import { NumberPadModal } from './number-pad-modal'

interface SetupWeightsProps {
  unit: string
}

export function SetupWeights({ unit }: SetupWeightsProps) {
  const [squatMax, setSquatMax] = useState(0)
  const [benchMax, setBenchMax] = useState(0)
  const [deadliftMax, setDeadliftMax] = useState(0)
  const [ohpMax, setOhpMax] = useState(0)
  const [showNumberPad, setShowNumberPad] = useState<string | null>(null)

  const handleSave = async () => {
    console.log('Start Training clicked with weights:', { squatMax, benchMax, deadliftMax, ohpMax })
    
    // Validate that all weights are entered (must be greater than 0)
    if (squatMax <= 0 || benchMax <= 0 || deadliftMax <= 0 || ohpMax <= 0) {
      alert('Please enter all starting weights')
      return
    }

    try {
      console.log('Sending weights to API...')
      const response = await fetch('/api/setup-weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          squatMax,
          benchMax,
          deadliftMax,
          ohpMax
        })
      })
      
      console.log('Setup response:', response.status)
      
      if (response.ok) {
        console.log('Weights saved successfully, redirecting...')
        // Redirect to home to show the workout with calculated weights
        window.location.href = '/'
      } else {
        const error = await response.text()
        console.error('Failed to save weights:', error)
        alert('Failed to save starting weights')
      }
    } catch (error) {
      console.error('Error saving weights:', error)
      alert('Failed to save starting weights: ' + error.message)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="glass glass-gradient rounded-lg p-6 mb-4">
        <h2 className="text-2xl font-bold tracking-wider uppercase mb-2">Welcome to GZCLP</h2>
        <p className="text-muted mb-6">Enter your starting weights (85% of your 5RM)</p>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Squat
            </label>
            <button
              onClick={() => setShowNumberPad('squat')}
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10 hover:bg-white/10 text-left"
            >
              {squatMax || 'Tap to enter'} {squatMax ? unit : ''}
            </button>
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Bench Press
            </label>
            <button
              onClick={() => setShowNumberPad('bench')}
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10 hover:bg-white/10 text-left"
            >
              {benchMax || 'Tap to enter'} {benchMax ? unit : ''}
            </button>
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Deadlift
            </label>
            <button
              onClick={() => setShowNumberPad('deadlift')}
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10 hover:bg-white/10 text-left"
            >
              {deadliftMax || 'Tap to enter'} {deadliftMax ? unit : ''}
            </button>
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Overhead Press
            </label>
            <button
              onClick={() => setShowNumberPad('ohp')}
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10 hover:bg-white/10 text-left"
            >
              {ohpMax || 'Tap to enter'} {ohpMax ? unit : ''}
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-6 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!squatMax || !benchMax || !deadliftMax || !ohpMax}
        >
          Start Training
        </button>
      </div>

      <div className="glass glass-gradient rounded-lg p-4 text-sm text-muted">
        <p className="font-bold mb-2">What is 85% of 5RM?</p>
        <p>Enter 85% of the weight you can lift for 5 reps with good form. This provides a safe starting point for the program.</p>
      </div>

      {showNumberPad && (
        <NumberPadModal
          isOpen={!!showNumberPad}
          initialValue={
            showNumberPad === 'squat' ? squatMax :
            showNumberPad === 'bench' ? benchMax :
            showNumberPad === 'deadlift' ? deadliftMax :
            ohpMax
          }
          title={
            showNumberPad === 'squat' ? 'Squat Starting Weight' :
            showNumberPad === 'bench' ? 'Bench Press Starting Weight' :
            showNumberPad === 'deadlift' ? 'Deadlift Starting Weight' :
            'Overhead Press Starting Weight'
          }
          unit={unit}
          onSave={(value) => {
            console.log(`Setting ${showNumberPad} weight to:`, value)
            if (showNumberPad === 'squat') setSquatMax(value)
            else if (showNumberPad === 'bench') setBenchMax(value)
            else if (showNumberPad === 'deadlift') setDeadliftMax(value)
            else if (showNumberPad === 'ohp') setOhpMax(value)
            setShowNumberPad(null)
          }}
          onClose={() => setShowNumberPad(null)}
        />
      )}
    </div>
  )
}