import { useState, useEffect, useCallback } from 'react'
import { NetworkMonitor } from '@/lib/offline/network-monitor'
import { OfflineQueue } from '@/lib/offline/offline-queue'
import { BackgroundSyncManager } from '@/lib/offline/background-sync'
import { OfflineCapabilities } from '@/lib/offline/capabilities'

interface OfflineStatus {
  isOnline: boolean
  connectionQuality: 'excellent' | 'good' | 'moderate' | 'poor' | 'offline'
  pendingCount: number
  failedCount: number
  canSync: boolean
  storageQuota?: {
    usage: number
    quota: number
    percentage: number
  }
}

// Singleton instances - only create on client side
let monitor: NetworkMonitor | null = null
let queue: OfflineQueue | null = null
let syncManager: BackgroundSyncManager | null = null
let capabilities: OfflineCapabilities | null = null

if (typeof window !== 'undefined') {
  monitor = new NetworkMonitor()
  queue = new OfflineQueue()
  syncManager = new BackgroundSyncManager()
  capabilities = new OfflineCapabilities()
}

export function useOfflineStatus() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : true,
    connectionQuality: 'offline',
    pendingCount: 0,
    failedCount: 0,
    canSync: false
  })

  const updateStatus = useCallback(async () => {
    if (!monitor || !queue || !syncManager || !capabilities) return
    
    // Check real connectivity
    const isOnline = await monitor.checkConnectivity()
    
    // Get connection quality
    const quality = isOnline 
      ? (await monitor.getConnectionQuality()).quality 
      : 'offline'
    
    // Get queue counts
    const pendingItems = await queue.getAll()
    const failedItems = await syncManager.getFailedItems()
    
    // Check sync capability
    const canSync = isOnline && capabilities.hasBackgroundSyncSupport()
    
    // Get storage quota if available
    let storageQuota
    if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        if (estimate.usage !== undefined && estimate.quota !== undefined) {
          storageQuota = {
            usage: estimate.usage,
            quota: estimate.quota,
            percentage: Math.round((estimate.usage / estimate.quota) * 100)
          }
        }
      } catch {
        // Storage estimate not available
      }
    }
    
    setStatus({
      isOnline,
      connectionQuality: quality,
      pendingCount: pendingItems.length,
      failedCount: failedItems.length,
      canSync,
      storageQuota
    })
  }, [])

  // Initial status check
  useEffect(() => {
    updateStatus()
  }, [updateStatus])

  // Listen for connectivity changes
  useEffect(() => {
    if (typeof window === 'undefined' || !monitor) return
    
    const handleOnline = () => updateStatus()
    const handleOffline = () => updateStatus()
    const handleConnectivityChange = () => updateStatus()

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    monitor.on('connectivityChange', handleConnectivityChange)

    // Start background monitoring
    monitor.startBackgroundMonitoring({ interval: 30000 })

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      monitor.off('connectivityChange', handleConnectivityChange)
      monitor.stop()
    }
  }, [updateStatus])

  // Listen for queue changes
  useEffect(() => {
    const interval = setInterval(() => {
      updateStatus()
    }, 30000) // Update every 30 seconds instead of 5

    return () => clearInterval(interval)
  }, [updateStatus])

  const retryFailed = useCallback(async () => {
    if (!syncManager || !queue) return
    
    // Move failed items back to queue
    const failed = await syncManager.getFailedItems()
    for (const item of failed) {
      await queue.add({
        type: item.type,
        data: item.data,
        maxRetries: 1 // One more try
      })
    }
    
    // Process queue
    await queue.processAll()
    
    // Update status
    updateStatus()
  }, [updateStatus])

  const clearFailed = useCallback(async () => {
    // In a real implementation, would clear failed items
    // For now, just update status
    updateStatus()
  }, [updateStatus])

  const forceSync = useCallback(async () => {
    if (status.isOnline && queue) {
      await queue.processAll()
      updateStatus()
    }
  }, [status.isOnline, updateStatus])

  return {
    ...status,
    retryFailed,
    clearFailed,
    forceSync,
    refresh: updateStatus
  }
}