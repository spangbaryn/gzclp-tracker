import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import { useWorkout } from '@/hooks/use-workout'
import { useOptimisticUpdate } from '@/hooks/use-optimistic-update'
import type { ReactNode } from 'react'

// Mock fetch
global.fetch = vi.fn()

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>
    {children}
  </SWRConfig>
)

describe('Optimistic UI Updates', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  describe('useWorkout hook with optimistic updates', () => {
    it('should update UI immediately on set completion', async () => {
      const mockWorkout = {
        id: 'workout-1',
        workoutType: 'A1',
        exercises: [{
          id: 'ex-1',
          name: 'Squat',
          sets: [
            { id: 'set-1', targetReps: 5, completedReps: 0, completed: false },
            { id: 'set-2', targetReps: 5, completedReps: 0, completed: false }
          ]
        }]
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(mockWorkout))
      )

      const { result } = renderHook(() => useWorkout(), { wrapper })

      await waitFor(() => {
        expect(result.current.workout).toEqual(mockWorkout)
      })

      // Complete a set optimistically
      await act(async () => {
        await result.current.completeSet('ex-1', 'set-1', 5)
      })

      // UI should update immediately
      expect(result.current.workout?.exercises[0].sets[0].completed).toBe(true)
      expect(result.current.workout?.exercises[0].sets[0].completedReps).toBe(5)

      // API call should be made in background
      expect(fetch).toHaveBeenCalledWith('/api/sets/set-1/complete', {
        method: 'POST',
        body: JSON.stringify({ completedReps: 5 })
      })
    })

    it('should rollback on API failure', async () => {
      const mockWorkout = {
        id: 'workout-1',
        exercises: [{
          id: 'ex-1',
          sets: [
            { id: 'set-1', completedReps: 0, completed: false }
          ]
        }]
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response(JSON.stringify(mockWorkout)))
        .mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useWorkout(), { wrapper })

      await waitFor(() => {
        expect(result.current.workout).toBeDefined()
      })

      // Attempt to complete set (will fail)
      await act(async () => {
        await result.current.completeSet('ex-1', 'set-1', 5)
      })

      // Should rollback after failure
      await waitFor(() => {
        expect(result.current.workout?.exercises[0].sets[0].completed).toBe(false)
        expect(result.current.workout?.exercises[0].sets[0].completedReps).toBe(0)
      })

      expect(result.current.error).toBeDefined()
    })

    it('should handle concurrent updates correctly', async () => {
      const mockWorkout = {
        exercises: [{
          sets: [
            { id: 'set-1', completed: false, completedReps: 0 },
            { id: 'set-2', completed: false, completedReps: 0 },
            { id: 'set-3', completed: false, completedReps: 0 }
          ]
        }]
      }

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockWorkout))
      )

      const { result } = renderHook(() => useWorkout(), { wrapper })

      await waitFor(() => {
        expect(result.current.workout).toBeDefined()
      })

      // Complete multiple sets rapidly
      await act(async () => {
        await Promise.all([
          result.current.completeSet('ex-1', 'set-1', 5),
          result.current.completeSet('ex-1', 'set-2', 5),
          result.current.completeSet('ex-1', 'set-3', 4)
        ])
      })

      // All updates should be applied
      const sets = result.current.workout?.exercises[0].sets
      expect(sets?.[0].completed).toBe(true)
      expect(sets?.[1].completed).toBe(true)
      expect(sets?.[2].completed).toBe(true)
      expect(sets?.[2].completedReps).toBe(4)
    })
  })

  describe('useOptimisticUpdate hook', () => {
    it('should provide optimistic update utilities', () => {
      const { result } = renderHook(() => useOptimisticUpdate())

      expect(result.current.applyOptimistic).toBeDefined()
      expect(result.current.rollback).toBeDefined()
      expect(result.current.commit).toBeDefined()
    })

    it('should track multiple optimistic updates', async () => {
      const { result } = renderHook(() => useOptimisticUpdate())

      const data = { count: 0 }
      
      // Apply multiple updates
      const update1 = result.current.applyOptimistic(data, { count: 1 })
      const update2 = result.current.applyOptimistic(update1.data, { count: 2 })

      expect(update2.data.count).toBe(2)

      // Rollback one
      const rolledBack = result.current.rollback(update2.data, update2.id)
      expect(rolledBack.count).toBe(1)

      // Rollback all
      const original = result.current.rollbackAll(rolledBack, [update1.id])
      expect(original.count).toBe(0)
    })

    it('should merge updates correctly', () => {
      const { result } = renderHook(() => useOptimisticUpdate())

      const data = {
        workout: {
          exercises: [
            { id: 'ex-1', name: 'Squat', weight: 135 }
          ]
        }
      }

      const { data: updated } = result.current.applyOptimistic(data, {
        workout: {
          exercises: [
            { id: 'ex-1', weight: 140 }
          ]
        }
      })

      expect(updated.workout.exercises[0].name).toBe('Squat')
      expect(updated.workout.exercises[0].weight).toBe(140)
    })
  })

  describe('Conflict Resolution', () => {
    it('should handle server pushing newer data after optimistic update', async () => {
      const initialWorkout = {
        id: 'workout-1',
        version: 1,
        exercises: [{
          id: 'ex-1',
          sets: [
            { id: 'set-1', completedReps: 0, completed: false },
            { id: 'set-2', completedReps: 0, completed: false }
          ]
        }]
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(initialWorkout))
      )

      const { result } = renderHook(() => useWorkout(), { wrapper })

      await waitFor(() => {
        expect(result.current.workout).toBeDefined()
      })

      // User completes set 1 optimistically
      await act(async () => {
        await result.current.completeSet('ex-1', 'set-1', 5)
      })

      // Verify optimistic update applied
      expect(result.current.workout?.exercises[0].sets[0].completed).toBe(true)

      // Server responds with newer data (someone else completed set 2)
      const serverUpdate = {
        ...initialWorkout,
        version: 2,
        exercises: [{
          ...initialWorkout.exercises[0],
          sets: [
            { id: 'set-1', completedReps: 0, completed: false }, // Server doesn't have our update
            { id: 'set-2', completedReps: 5, completed: true } // But has this other update
          ]
        }]
      }

      // Simulate SWR revalidation with server data
      await act(async () => {
        await result.current.mutate(serverUpdate, {
          revalidate: false,
          populateCache: true,
          optimisticData: (current) => {
            // Merge strategy: keep local changes that are newer
            return result.current.mergeWithServer(current, serverUpdate)
          }
        })
      })

      // Should have both updates after merge
      const merged = result.current.workout
      expect(merged?.exercises[0].sets[0].completed).toBe(true) // Our local change
      expect(merged?.exercises[0].sets[0].completedReps).toBe(5) // Our local change
      expect(merged?.exercises[0].sets[1].completed).toBe(true) // Server change
      expect(merged?.version).toBe(2) // Server version
    })

    it('should resolve conflicts based on timestamp', async () => {
      const { result } = renderHook(() => useOptimisticUpdate())

      const localUpdate = {
        setId: 'set-1',
        completed: true,
        completedReps: 5,
        timestamp: new Date('2024-01-01T10:00:00Z')
      }

      const serverUpdate = {
        setId: 'set-1',
        completed: true,
        completedReps: 6,
        timestamp: new Date('2024-01-01T10:00:30Z')
      }

      const resolved = result.current.resolveConflict(localUpdate, serverUpdate)

      // Server update is newer, should win
      expect(resolved.completedReps).toBe(6)
      expect(resolved.source).toBe('server')
    })

    it('should handle complex merge scenarios', async () => {
      const workout = {
        exercises: [
          {
            id: 'ex-1',
            sets: [
              { id: 'set-1', completed: false, completedReps: 0 },
              { id: 'set-2', completed: false, completedReps: 0 }
            ]
          },
          {
            id: 'ex-2',
            sets: [
              { id: 'set-3', completed: false, completedReps: 0 }
            ]
          }
        ]
      }

      const { result } = renderHook(() => useWorkout(), { wrapper })
      
      // Multiple optimistic updates
      await act(async () => {
        // User updates
        await result.current.completeSet('ex-1', 'set-1', 5)
        await result.current.completeSet('ex-2', 'set-3', 10)
      })

      // Server has different updates
      const serverData = {
        exercises: [
          {
            id: 'ex-1',
            sets: [
              { id: 'set-1', completed: false, completedReps: 0 },
              { id: 'set-2', completed: true, completedReps: 5 } // Different set completed
            ]
          },
          {
            id: 'ex-2',
            sets: [
              { id: 'set-3', completed: false, completedReps: 0 } // No update here
            ],
            notes: 'Feeling strong today' // Additional field
          }
        ]
      }

      const merged = result.current.smartMerge(
        result.current.workout,
        serverData
      )

      // Should have all updates merged correctly
      expect(merged.exercises[0].sets[0].completed).toBe(true) // Local
      expect(merged.exercises[0].sets[1].completed).toBe(true) // Server
      expect(merged.exercises[1].sets[0].completed).toBe(true) // Local
      expect(merged.exercises[1].notes).toBe('Feeling strong today') // Server addition
    })
  })

  describe('Offline queue with optimistic updates', () => {
    it('should queue updates when offline and apply optimistically', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const mockWorkout = {
        exercises: [{
          sets: [{ id: 'set-1', completed: false }]
        }]
      }

      vi.mocked(fetch).mockResolvedValue(
        new Response(JSON.stringify(mockWorkout))
      )

      const { result } = renderHook(() => useWorkout(), { wrapper })

      await waitFor(() => {
        expect(result.current.workout).toBeDefined()
      })

      // Complete set while offline
      await act(async () => {
        await result.current.completeSet('ex-1', 'set-1', 5)
      })

      // Should update optimistically
      expect(result.current.workout?.exercises[0].sets[0].completed).toBe(true)
      
      // Should be queued
      expect(result.current.pendingUpdates).toHaveLength(1)
    })

    it('should sync queued updates when coming online', async () => {
      // Start offline
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

      const { result } = renderHook(() => useWorkout(), { wrapper })

      // Queue some updates
      await act(async () => {
        await result.current.completeSet('ex-1', 'set-1', 5)
        await result.current.completeSet('ex-1', 'set-2', 5)
      })

      expect(result.current.pendingUpdates).toHaveLength(2)

      // Come back online
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
      
      await act(async () => {
        await result.current.syncPendingUpdates()
      })

      // Updates should be synced
      expect(fetch).toHaveBeenCalledTimes(2)
      expect(result.current.pendingUpdates).toHaveLength(0)
    })
  })
})