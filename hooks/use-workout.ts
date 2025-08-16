import useSWR, { mutate } from 'swr'
import { WorkoutCache } from '@/lib/offline/workout-cache'
import { OfflineQueue } from '@/lib/offline/offline-queue'
import { NetworkMonitor } from '@/lib/offline/network-monitor'
import type { Workout, Exercise, Set } from '@prisma/client'

interface WorkoutWithExercises extends Workout {
  exercises: (Exercise & {
    sets: Set[]
  })[]
}

interface UseWorkoutReturn {
  workout: WorkoutWithExercises | undefined
  error: Error | undefined
  isLoading: boolean
  completeSet: (exerciseId: string, setId: string, completedReps: number) => Promise<void>
  mutate: typeof mutate
  pendingUpdates: any[]
  syncPendingUpdates: () => Promise<void>
  mergeWithServer: (local: any, server: any) => any
}

// Initialize offline infrastructure - only on client side
let cache: WorkoutCache | null = null
let queue: OfflineQueue | null = null
let monitor: NetworkMonitor | null = null

if (typeof window !== 'undefined') {
  cache = new WorkoutCache()
  queue = new OfflineQueue()
  monitor = new NetworkMonitor()
}

// SWR fetcher that integrates with offline cache
const fetcher = async (url: string) => {
  // Server-side or no monitor: just fetch
  if (!monitor || !cache) {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }
  
  // Check if online
  const isOnline = await monitor.checkConnectivity()
  
  if (!isOnline) {
    // Return cached data when offline
    const cached = await cache.get(url)
    if (cached) return cached
    throw new Error('No cached data available')
  }

  // Fetch from network
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to fetch workout')
  }
  
  const data = await response.json()
  
  // Cache the response
  await cache.put(url, data)
  
  return data
}

export function useWorkout(): UseWorkoutReturn {
  const { data, error, isLoading } = useSWR<WorkoutWithExercises>(
    '/api/current-workout',
    fetcher,
    {
      revalidateOnFocus: false,  // Don't revalidate on window focus
      revalidateOnReconnect: true,  // Only revalidate when reconnecting
      revalidateIfStale: false,  // Don't automatically revalidate stale data
      dedupingInterval: 10000,  // Dedupe requests for 10 seconds
      refreshInterval: 0  // No automatic refresh
    }
  )

  // Track pending updates in local state
  const getPendingUpdates = async () => {
    return queue ? queue.getAll() : []
  }

  const completeSet = async (exerciseId: string, setId: string, completedReps: number) => {
    // For offline mode, we just queue the action without updating UI
    // The workout-view component handles its own state
    if (!data) {
      console.log('No workout data available, queueing action for sync')
      if (queue) {
        await queue.add({
          type: 'set-complete',
          data: { exerciseId, setId, completedReps }
        })
      }
      return
    }

    // Optimistically update the UI (only if we have data)
    const optimisticData = {
      ...data,
      exercises: data.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map(set => {
              if (set.id === setId) {
                return {
                  ...set,
                  completed: true,
                  completedReps
                }
              }
              return set
            })
          }
        }
        return ex
      })
    }

    // Update SWR cache immediately
    await mutate('/api/current-workout', optimisticData, false)

    // Queue the update for background sync
    try {
      const isOnline = monitor ? await monitor.checkConnectivity() : true
      
      if (isOnline) {
        // Try to sync immediately
        const response = await fetch(`/api/sets/${setId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completedReps })
        })

        if (!response.ok) {
          throw new Error('Failed to complete set')
        }

        // Revalidate to ensure consistency
        await mutate('/api/current-workout')
      } else if (queue) {
        // Queue for later sync
        await queue.add({
          type: 'set-complete',
          data: { exerciseId, setId, completedReps }
        })
      }
    } catch (error) {
      // On error, queue for retry and keep optimistic update
      if (queue) {
        await queue.add({
          type: 'set-complete',
          data: { exerciseId, setId, completedReps }
        })
      }
      
      // Don't throw - let the UI stay optimistic
      console.warn('Set completion queued for sync:', error)
    }
  }

  const syncPendingUpdates = async () => {
    if (queue) {
      await queue.processAll()
    }
    // Revalidate after sync
    await mutate('/api/current-workout')
  }

  const mergeWithServer = (local: WorkoutWithExercises, server: WorkoutWithExercises): WorkoutWithExercises => {
    if (!local || !server) return server

    // For single-user app, we can use a simple merge strategy
    // Keep local changes for current session, but accept server version and new fields
    
    // Create a map of local set states
    const localSetStates = new Map<string, { completed: boolean; completedReps: number }>()
    local.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          localSetStates.set(set.id, {
            completed: set.completed,
            completedReps: set.completedReps
          })
        }
      })
    })

    // Merge server data with local changes
    return {
      ...server,
      exercises: server.exercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(set => {
          const localState = localSetStates.get(set.id)
          if (localState) {
            // Keep local completion state
            return {
              ...set,
              ...localState
            }
          }
          return set
        })
      }))
    }
  }

  // Set up queue processor only on client side
  if (typeof window !== 'undefined' && queue) {
    queue.setProcessor(async (item) => {
      if (item.type === 'set-complete') {
        const response = await fetch(`/api/sets/${item.data.setId}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completedReps: item.data.completedReps })
        })
        return { success: response.ok }
      }
      return { success: false }
    })
  }

  return {
    workout: data,
    error,
    isLoading,
    completeSet,
    mutate,
    pendingUpdates: [], // Would implement proper tracking
    syncPendingUpdates,
    mergeWithServer
  }
}