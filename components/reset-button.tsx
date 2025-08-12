'use client'

import { useRouter } from 'next/navigation'

export function ResetButton() {
  const router = useRouter()
  
  const handleReset = async () => {
    if (!confirm('This will reset ALL your workout data. Continue?')) {
      return
    }
    
    try {
      const res = await fetch('/api/reset', { method: 'POST' })
      if (res.ok) {
        alert('Data reset successfully!')
        router.push('/')
        router.refresh()
      } else {
        alert('Failed to reset data')
      }
    } catch (error) {
      console.error('Reset error:', error)
      alert('Failed to reset data')
    }
  }
  
  return (
    <div className="mt-8 p-4 glass border-2 border-red-500/50 rounded-lg">
      <h2 className="text-lg font-bold mb-4 text-red-500 uppercase tracking-wider">Debug Tools</h2>
      <p className="text-sm text-muted mb-4">
        If you're seeing incorrect data (like 7999 lbs or wrong sets), use this to reset:
      </p>
      <button
        onClick={handleReset}
        className="w-full py-3 px-4 bg-red-500/20 border-2 border-red-500 text-red-500 rounded-lg font-bold uppercase tracking-wider hover:bg-red-500/30 transition-all"
      >
        Reset All Data
      </button>
    </div>
  )
}