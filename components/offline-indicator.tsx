'use client'

import { useOfflineStatus } from '@/hooks/use-offline-status'
import { useEffect, useState } from 'react'

export function OfflineIndicator() {
  const { 
    isOnline, 
    connectionQuality, 
    pendingCount, 
    failedCount,
    retryFailed,
    forceSync 
  } = useOfflineStatus()
  
  const [showDetails, setShowDetails] = useState(false)
  const [isMinimized, setIsMinimized] = useState(true)

  // Auto-hide when online with no pending items
  useEffect(() => {
    if (isOnline && pendingCount === 0 && failedCount === 0) {
      const timer = setTimeout(() => setIsMinimized(true), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, pendingCount, failedCount])

  // Don't show if online with good connection and no pending items
  if (isOnline && connectionQuality === 'excellent' && pendingCount === 0 && failedCount === 0) {
    return null
  }

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500'
    if (failedCount > 0) return 'bg-red-500'
    if (connectionQuality === 'poor') return 'bg-orange-500'
    if (pendingCount > 0) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusText = () => {
    if (!isOnline) return 'Offline'
    if (failedCount > 0) return `${failedCount} failed`
    if (pendingCount > 0) return `${pendingCount} pending`
    if (connectionQuality === 'poor') return 'Poor connection'
    return 'Online'
  }

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-4 right-4 z-50 ${getStatusColor()} text-white rounded-full p-3 shadow-lg transition-all active:scale-95`}
        aria-label="Network status"
      >
        <div className="relative">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {isOnline ? (
              <path d="M5 12.55a11 11 0 0 1 14.08 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
            ) : (
              <>
                <path d="M5 12.55a11 11 0 0 1 14.08 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </>
            )}
          </svg>
          {(pendingCount > 0 || failedCount > 0) && (
            <span className="absolute -top-1 -right-1 bg-white text-black text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {pendingCount + failedCount}
            </span>
          )}
        </div>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 glass rounded-lg p-4 shadow-lg max-w-xs">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="font-semibold text-foreground">{getStatusText()}</span>
        </div>
        <button
          onClick={() => setIsMinimized(true)}
          className="text-muted hover:text-foreground transition-colors"
          aria-label="Minimize"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {!isOnline && (
        <p className="text-sm text-muted mb-3">
          Your workout data is being saved locally and will sync when you reconnect.
        </p>
      )}

      {connectionQuality === 'poor' && isOnline && (
        <p className="text-sm text-muted mb-3">
          Connection is slow. Consider working offline for better performance.
        </p>
      )}

      {(pendingCount > 0 || failedCount > 0) && (
        <div className="space-y-2">
          {pendingCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{pendingCount} updates pending</span>
              {isOnline && (
                <button
                  onClick={forceSync}
                  className="text-xs text-primary hover:underline"
                >
                  Sync now
                </button>
              )}
            </div>
          )}
          
          {failedCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-400">{failedCount} updates failed</span>
              <button
                onClick={retryFailed}
                className="text-xs text-primary hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowDetails(!showDetails)}
        className="text-xs text-muted hover:text-foreground mt-2"
      >
        {showDetails ? 'Hide' : 'Show'} details
      </button>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs text-muted">
          <div>Connection: {connectionQuality}</div>
          <div>Status: {isOnline ? 'Online' : 'Offline'}</div>
          <div>Pending sync: {pendingCount}</div>
          <div>Failed sync: {failedCount}</div>
        </div>
      )}
    </div>
  )
}