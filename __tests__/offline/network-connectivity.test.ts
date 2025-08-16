import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NetworkMonitor } from '@/lib/offline/network-monitor'

// Mock fetch
global.fetch = vi.fn()

describe('Network Connectivity Verification', () => {
  let monitor: NetworkMonitor
  
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    monitor = new NetworkMonitor()
  })
  
  afterEach(() => {
    vi.useRealTimers()
    monitor.stop()
  })

  describe('Real Connectivity Detection', () => {
    it('should verify actual connectivity with heartbeat, not just navigator.onLine', async () => {
      // navigator says online, but network is unreachable
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      vi.mocked(fetch).mockRejectedValue(new Error('Network unreachable'))
      
      const isReallyOnline = await monitor.checkConnectivity()
      
      expect(isReallyOnline).toBe(false)
      expect(fetch).toHaveBeenCalledWith('/api/ping', {
        method: 'HEAD',
        cache: 'no-store'
      })
    })

    it('should detect captive portal / hotel WiFi false positives', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      
      // Captive portal returns 200 but with redirect
      vi.mocked(fetch).mockResolvedValue(new Response('', {
        status: 200,
        headers: { 'x-captive-portal': 'true' }
      }))
      
      const isReallyOnline = await monitor.checkConnectivity()
      
      expect(isReallyOnline).toBe(false)
    })

    it('should handle slow/flaky connections with timeout', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      
      // Very slow response
      vi.mocked(fetch).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => 
          resolve(new Response('', { status: 200 })), 10000
        ))
      )
      
      const isOnline = await monitor.checkConnectivity({ timeout: 2000 })
      
      expect(isOnline).toBe(false) // Timed out
    })

    it('should use multiple endpoints for redundancy', async () => {
      const endpoints = ['/api/ping', '/health', '/']
      
      // First two fail, third succeeds
      vi.mocked(fetch)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(new Response('', { status: 200 }))
      
      const isOnline = await monitor.checkConnectivity({ endpoints })
      
      expect(isOnline).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Connection Quality Monitoring', () => {
    it('should measure connection latency', async () => {
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 150))
        return new Response('', { status: 200 })
      })
      
      const quality = await monitor.getConnectionQuality()
      
      expect(quality.latency).toBeGreaterThan(100)
      expect(quality.latency).toBeLessThan(200)
      expect(quality.quality).toBe('moderate')
    })

    it('should detect poor connection quality', async () => {
      // Simulate packet loss - some requests fail
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount % 3 === 0) {
          return Promise.reject(new Error('Timeout'))
        }
        return Promise.resolve(new Response('', { status: 200 }))
      })
      
      const quality = await monitor.measureQuality({ samples: 10 })
      
      expect(quality.packetLoss).toBeGreaterThan(0.25)
      expect(quality.quality).toBe('poor')
      expect(quality.recommendation).toContain('offline mode')
    })
  })

  describe('Adaptive Sync Strategy', () => {
    it('should adjust sync frequency based on connection quality', async () => {
      // Start with good connection
      vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
      
      const strategy = await monitor.getSyncStrategy()
      expect(strategy.interval).toBe(5000) // 5 seconds
      
      // Degrade to poor connection
      vi.mocked(fetch).mockRejectedValue(new Error('Timeout'))
      
      const newStrategy = await monitor.getSyncStrategy()
      expect(newStrategy.interval).toBeGreaterThan(30000) // Back off
      expect(newStrategy.batchSize).toBeLessThan(strategy.batchSize)
    })

    it('should pause sync entirely on very poor connections', async () => {
      // Very high latency
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return new Response('', { status: 200 })
      })
      
      const strategy = await monitor.getSyncStrategy()
      
      expect(strategy.shouldSync).toBe(false)
      expect(strategy.reason).toContain('connection too slow')
    })
  })

  describe('Offline Detection Events', () => {
    it('should emit events when connectivity changes', async () => {
      const onStatusChange = vi.fn()
      monitor.on('connectivityChange', onStatusChange)
      
      // Start online
      vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
      await monitor.checkConnectivity()
      
      // Go offline
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))
      await monitor.checkConnectivity()
      
      expect(onStatusChange).toHaveBeenCalledWith({
        online: false,
        quality: 'offline',
        timestamp: expect.any(Date)
      })
    })

    it('should debounce rapid connectivity changes', async () => {
      const onChange = vi.fn()
      monitor.on('connectivityChange', onChange)
      
      // Rapid online/offline/online
      vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 200 }))
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Failed'))
      vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 200 }))
      
      await monitor.checkConnectivity()
      await monitor.checkConnectivity()
      await monitor.checkConnectivity()
      
      // Should only emit once due to debouncing
      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('Background Connectivity Monitoring', () => {
    it('should periodically check connectivity in background', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
      
      monitor.startBackgroundMonitoring({ interval: 10000 })
      
      // Initial check
      expect(fetch).toHaveBeenCalledTimes(1)
      
      // Advance 10 seconds
      vi.advanceTimersByTime(10000)
      expect(fetch).toHaveBeenCalledTimes(2)
      
      // Advance another 10 seconds
      vi.advanceTimersByTime(10000)
      expect(fetch).toHaveBeenCalledTimes(3)
    })

    it('should stop monitoring when app is hidden', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
      
      monitor.startBackgroundMonitoring({ interval: 5000 })
      
      // Simulate app hidden
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        configurable: true
      })
      document.dispatchEvent(new Event('visibilitychange'))
      
      const callsBefore = fetch.mock.calls.length
      
      // Advance time - should not make more calls
      vi.advanceTimersByTime(10000)
      
      expect(fetch.mock.calls.length).toBe(callsBefore)
    })
  })

  describe('Workout-Specific Connectivity', () => {
    it('should warn before starting workout with poor connection', async () => {
      // Poor connection
      vi.mocked(fetch).mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 3000))
        return new Response('', { status: 200 })
      })
      
      const canStartWorkout = await monitor.checkWorkoutReadiness()
      
      expect(canStartWorkout.ready).toBe(true) // Can still start
      expect(canStartWorkout.warning).toContain('poor connection')
      expect(canStartWorkout.recommendation).toBe('offline-first')
    })

    it('should ensure critical data is synced before workout', async () => {
      vi.mocked(fetch).mockResolvedValue(new Response('', { status: 200 }))
      
      const criticalData = ['user-settings', 'current-progression', 'exercise-history']
      const syncStatus = await monitor.verifyCriticalDataSync(criticalData)
      
      expect(syncStatus.allSynced).toBe(true)
      expect(syncStatus.readyForOffline).toBe(true)
    })
  })
})