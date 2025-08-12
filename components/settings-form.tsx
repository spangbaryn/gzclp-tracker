'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserSettings } from '@prisma/client'

interface SettingsFormProps {
  settings: UserSettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [unit, setUnit] = useState(settings.unit)
  const [squatMax, setSquatMax] = useState(settings.squatMax)
  const [benchMax, setBenchMax] = useState(settings.benchMax)
  const [deadliftMax, setDeadliftMax] = useState(settings.deadliftMax)
  const [ohpMax, setOhpMax] = useState(settings.ohpMax)
  const router = useRouter()

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unit,
        squatMax,
        benchMax,
        deadliftMax,
        ohpMax
      })
    })
    alert('Saved')
    router.refresh()
  }

  const handleReset = async () => {
    if (confirm('Delete all data?')) {
      await fetch('/api/reset', { method: 'POST' })
      router.refresh()
    }
  }

  return (
    <>
      <div className="glass glass-gradient rounded-lg p-6 mb-4">
        <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#a8a8a8] mb-5">
          Units
        </h3>
        <div className="flex rounded-lg overflow-hidden bg-white/5 border border-white/10">
          <button
            onClick={() => setUnit('lbs')}
            className={`flex-1 py-[14px] text-center cursor-pointer transition-all uppercase text-xs tracking-[1px] font-bold min-h-[48px] focus:outline-2 focus:outline-ring focus:-outline-offset-2 ${
              unit === 'lbs' ? 'bg-foreground text-background' : 'text-muted hover:bg-white/5'
            }`}
          >
            LBS
          </button>
          <button
            onClick={() => setUnit('kg')}
            className={`flex-1 py-[14px] text-center cursor-pointer transition-all uppercase text-xs tracking-[1px] font-bold min-h-[48px] focus:outline-2 focus:outline-ring focus:-outline-offset-2 ${
              unit === 'kg' ? 'bg-foreground text-background' : 'text-muted hover:bg-white/5'
            }`}
          >
            KG
          </button>
        </div>
      </div>

      <div className="glass glass-gradient rounded-lg p-6 mb-4">
        <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#a8a8a8] mb-6">
          Starting Weights
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Squat (85% 5RM)
            </label>
            <input
              type="number"
              value={squatMax}
              onChange={(e) => setSquatMax(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Bench Press (85% 5RM)
            </label>
            <input
              type="number"
              value={benchMax}
              onChange={(e) => setBenchMax(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Deadlift (85% 5RM)
            </label>
            <input
              type="number"
              value={deadliftMax}
              onChange={(e) => setDeadliftMax(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10"
            />
          </div>

          <div>
            <label className="block mb-2 text-muted text-xs font-bold uppercase tracking-[1.5px]">
              Overhead Press (85% 5RM)
            </label>
            <input
              type="number"
              value={ohpMax}
              onChange={(e) => setOhpMax(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="w-full py-3 px-4 rounded-lg border-2 border-white/10 bg-white/5 text-foreground text-base font-semibold transition-all focus:outline-none focus:border-white/30 focus:bg-white/10"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-6 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
        >
          Save Settings
        </button>
      </div>

      <div className="glass glass-gradient rounded-lg p-6">
        <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#a8a8a8] mb-5">
          Data Management
        </h3>
        <p className="text-xs text-muted mb-4">
          This will permanently delete all workout history and reset your progress.
        </p>
        <button
          onClick={handleReset}
          className="w-full py-[18px] rounded-lg border-2 border-red-900/50 text-red-400 bg-red-950/20 text-sm tracking-[2px] uppercase font-bold cursor-pointer transition-all min-h-[56px] hover:bg-red-900/30 hover:border-red-800/50 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
        >
          Reset All Data
        </button>
      </div>
    </>
  )
}