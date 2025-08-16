/* eslint-disable @typescript-eslint/no-unused-vars */
import { EventEmitter } from 'events'

interface ConnectionQuality {
  latency: number
  packetLoss: number
  quality: 'excellent' | 'good' | 'moderate' | 'poor' | 'offline'
  recommendation?: string
}

interface SyncStrategy {
  interval: number
  batchSize: number
  shouldSync: boolean
  reason?: string
}

interface ConnectivityOptions {
  timeout?: number
  endpoints?: string[]
}

interface WorkoutReadiness {
  ready: boolean
  warning?: string
  recommendation?: 'online' | 'offline-first'
}

export class NetworkMonitor extends EventEmitter {
  private isMonitoring = false
  private monitoringInterval?: NodeJS.Timeout
  private lastConnectivityState = true
  private debounceTimer?: NodeJS.Timeout

  async checkConnectivity(options: ConnectivityOptions = {}): Promise<boolean> {
    const { timeout = 3000, endpoints = ['/api/ping'] } = options

    // Server-side always returns true (assume online)
    if (typeof window === 'undefined') {
      return true
    }

    // First check navigator.onLine
    if (!navigator.onLine) {
      this.updateConnectivityState(false)
      return false
    }

    // Then verify actual connectivity
    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(endpoint, {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        // Check for captive portal
        if (response.headers.get('x-captive-portal') === 'true') {
          continue
        }

        if (response.ok) {
          this.updateConnectivityState(true)
          return true
        }
      } catch (error) {
        // Try next endpoint
        continue
      }
    }

    this.updateConnectivityState(false)
    return false
  }

  async getConnectionQuality(): Promise<ConnectionQuality> {
    const samples = 5
    const results: { latency: number; success: boolean }[] = []

    for (let i = 0; i < samples; i++) {
      const start = Date.now()
      try {
        await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(5000)
        })
        results.push({ latency: Date.now() - start, success: true })
      } catch {
        results.push({ latency: 5000, success: false })
      }
    }

    const successfulPings = results.filter(r => r.success)
    const packetLoss = 1 - (successfulPings.length / samples)
    const avgLatency = successfulPings.length > 0
      ? successfulPings.reduce((sum, r) => sum + r.latency, 0) / successfulPings.length
      : 5000

    let quality: ConnectionQuality['quality']
    let recommendation: string | undefined

    if (packetLoss === 1) {
      quality = 'offline'
      recommendation = 'Work offline - no connection available'
    } else if (packetLoss > 0.25 || avgLatency > 3000) {
      quality = 'poor'
      recommendation = 'Consider offline mode - connection is unreliable'
    } else if (avgLatency > 1000) {
      quality = 'moderate'
      recommendation = 'Connection is slow - some features may be delayed'
    } else if (avgLatency > 300) {
      quality = 'good'
    } else {
      quality = 'excellent'
    }

    return {
      latency: avgLatency,
      packetLoss,
      quality,
      recommendation
    }
  }

  async measureQuality(options: { samples: number }): Promise<ConnectionQuality> {
    const results: boolean[] = []
    
    for (let i = 0; i < options.samples; i++) {
      try {
        await fetch('/api/ping', {
          method: 'HEAD',
          cache: 'no-store',
          signal: AbortSignal.timeout(2000)
        })
        results.push(true)
      } catch {
        results.push(false)
      }
    }

    const successCount = results.filter(r => r).length
    const packetLoss = 1 - (successCount / options.samples)

    return {
      latency: 0, // Not measured in this implementation
      packetLoss,
      quality: packetLoss > 0.25 ? 'poor' : 'good',
      recommendation: packetLoss > 0.25 ? 'Use offline mode' : undefined
    }
  }

  async getSyncStrategy(): Promise<SyncStrategy> {
    const quality = await this.getConnectionQuality()

    switch (quality.quality) {
      case 'excellent':
        return {
          interval: 5000,
          batchSize: 50,
          shouldSync: true
        }
      case 'good':
        return {
          interval: 10000,
          batchSize: 25,
          shouldSync: true
        }
      case 'moderate':
        return {
          interval: 30000,
          batchSize: 10,
          shouldSync: true
        }
      case 'poor':
        return {
          interval: 60000,
          batchSize: 5,
          shouldSync: false,
          reason: 'connection too slow'
        }
      case 'offline':
        return {
          interval: 0,
          batchSize: 0,
          shouldSync: false,
          reason: 'no connection'
        }
    }
  }

  startBackgroundMonitoring(options: { interval: number }) {
    if (this.isMonitoring) return

    this.isMonitoring = true
    
    // Initial check
    this.checkConnectivity()

    // Periodic checks
    this.monitoringInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.checkConnectivity()
      }
    }, options.interval)

    // Listen for visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange)
  }

  stop() {
    this.isMonitoring = false
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    document.removeEventListener('visibilitychange', this.handleVisibilityChange)
  }

  async checkWorkoutReadiness(): Promise<WorkoutReadiness> {
    const quality = await this.getConnectionQuality()

    if (quality.quality === 'offline') {
      return {
        ready: true,
        warning: 'You are offline. Your workout will be saved locally and synced when you reconnect.',
        recommendation: 'offline-first'
      }
    }

    if (quality.quality === 'poor') {
      return {
        ready: true,
        warning: 'Your connection is poor. Consider working offline to avoid interruptions.',
        recommendation: 'offline-first'
      }
    }

    return {
      ready: true,
      recommendation: 'online'
    }
  }

  async verifyCriticalDataSync(dataKeys: string[]): Promise<{
    allSynced: boolean
    readyForOffline: boolean
  }> {
    // In a real implementation, this would check if critical data is cached
    const isOnline = await this.checkConnectivity()
    
    return {
      allSynced: isOnline,
      readyForOffline: true // Assume data is always cached for this implementation
    }
  }

  private updateConnectivityState(isOnline: boolean) {
    if (this.lastConnectivityState !== isOnline) {
      // Debounce rapid changes
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }

      this.debounceTimer = setTimeout(() => {
        this.lastConnectivityState = isOnline
        this.emit('connectivityChange', {
          online: isOnline,
          quality: isOnline ? 'unknown' : 'offline',
          timestamp: new Date()
        })
      }, 500)
    }
  }

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && this.isMonitoring) {
      // Check connectivity when app becomes visible
      this.checkConnectivity()
    }
  }
}