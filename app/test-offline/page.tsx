'use client'

import { useOfflineStatus } from '@/hooks/use-offline-status'
import { useState } from 'react'
import { AppContainer } from '@/components/app-container'

export default function TestOfflinePage() {
  const { 
    isOnline, 
    connectionQuality, 
    pendingCount, 
    failedCount,
    retryFailed,
    forceSync 
  } = useOfflineStatus()
  
  const [lastAction, setLastAction] = useState<string>('')
  const [testCount, setTestCount] = useState(0)

  const handleTestAction = () => {
    setTestCount(prev => prev + 1)
    setLastAction(`Test action #${testCount + 1} completed ${isOnline ? 'online' : 'offline'}`)
  }

  return (
    <AppContainer>
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 text-center uppercase tracking-wider">Offline Test</h1>
        
        {/* Connection Status */}
        <div className="glass rounded-lg p-6 mb-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-muted">Connection Status</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Online:</span>
              <span className={`font-medium ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
                {isOnline ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quality:</span>
              <span className={`font-medium ${
                connectionQuality === 'excellent' ? 'text-green-500' :
                connectionQuality === 'good' ? 'text-blue-500' :
                connectionQuality === 'moderate' ? 'text-yellow-500' :
                connectionQuality === 'poor' ? 'text-orange-500' :
                'text-red-500'
              }`}>
                {connectionQuality}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-medium">{pendingCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Failed:</span>
              <span className={`font-medium ${failedCount > 0 ? 'text-red-500' : ''}`}>
                {failedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Test Actions */}
        <div className="glass rounded-lg p-6 mb-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-muted">Test Actions</h2>
          <div className="space-y-3">
            <button
              onClick={handleTestAction}
              className="w-full p-4 bg-primary text-primary-foreground rounded-lg font-medium uppercase tracking-wide active:scale-95 transition-transform"
            >
              Simulate Action
            </button>
            
            {pendingCount > 0 && isOnline && (
              <button
                onClick={forceSync}
                className="w-full p-4 bg-green-600/20 text-green-400 border border-green-600/40 rounded-lg font-medium uppercase tracking-wide active:scale-95 transition-transform"
              >
                Force Sync ({pendingCount})
              </button>
            )}
            
            {failedCount > 0 && (
              <button
                onClick={retryFailed}
                className="w-full p-4 bg-orange-600/20 text-orange-400 border border-orange-600/40 rounded-lg font-medium uppercase tracking-wide active:scale-95 transition-transform"
              >
                Retry Failed ({failedCount})
              </button>
            )}
          </div>
          
          {lastAction && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              {lastAction}
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="glass rounded-lg p-6 border border-border">
          <h2 className="text-lg font-semibold mb-4 uppercase tracking-wide text-muted">How to Test</h2>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Open DevTools → Application → Service Workers</li>
            <li>2. Check "Offline" to simulate offline mode</li>
            <li>3. Click "Simulate Action" while offline</li>
            <li>4. Uncheck "Offline" to go back online</li>
            <li>5. Watch data sync automatically</li>
            <li>6. Test slow connection: Network → Slow 3G</li>
          </ol>
        </div>
      </div>
    </AppContainer>
  )
}