'use client'

import { useState } from 'react'
import type { UserSettings } from '@prisma/client'

interface SettingsFormProps {
  settings: UserSettings
}

export function SettingsForm({ settings }: SettingsFormProps) {
  const [unit, setUnit] = useState(settings.unit)

  const handleSave = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit
        })
      })
      
      if (response.ok) {
        alert('Settings saved successfully!')
        // Force a complete page reload to show updated values
        window.location.reload()
      } else {
        alert('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const handleReset = async () => {
    console.log('Reset button clicked')
    const confirmReset = confirm('This will delete all your workout history and reset your progress. Are you sure?')
    console.log('User confirmed:', confirmReset)
    
    if (confirmReset) {
      try {
        console.log('Calling reset API...')
        const response = await fetch('/api/reset', { method: 'POST' })
        console.log('Reset response:', response.status)
        
        if (response.ok) {
          alert('Data reset successfully!')
          // Force reload to show reset values
          window.location.href = '/'
        } else {
          const error = await response.text()
          console.error('Reset failed:', error)
          alert('Failed to reset data')
        }
      } catch (error) {
        console.error('Error resetting data:', error)
        alert('Failed to reset data: ' + error.message)
      }
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
        <button
          onClick={handleSave}
          className="w-full py-[18px] rounded-lg glass border-2 border-white/20 text-sm tracking-[2px] uppercase font-bold text-foreground cursor-pointer mt-6 transition-all min-h-[56px] hover:bg-white/10 hover:border-white/30 hover:shadow-lg hover:shadow-white/5 focus:outline-2 focus:outline-ring focus:-outline-offset-2 active:scale-[0.99]"
        >
          Save Units
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