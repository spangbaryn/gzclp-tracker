import { useCallback, useRef } from 'react'

interface OptimisticUpdate {
  id: string
  data: any
  original?: any
}

interface ConflictResolution {
  completedReps: number
  source: 'local' | 'server'
}

export function useOptimisticUpdate() {
  const updates = useRef<Map<string, OptimisticUpdate>>(new Map())

  const applyOptimistic = useCallback((data: any, changes: any): OptimisticUpdate => {
    const updateId = `opt-${Date.now()}-${Math.random()}`
    
    // Deep clone original data
    const original = JSON.parse(JSON.stringify(data))
    
    // Apply changes (shallow merge)
    const updated = mergeDeep(data, changes)
    
    const update: OptimisticUpdate = {
      id: updateId,
      data: updated,
      original
    }
    
    updates.current.set(updateId, update)
    
    return update
  }, [])

  const rollback = useCallback((data: any, updateId: string): any => {
    const update = updates.current.get(updateId)
    if (!update) return data
    
    updates.current.delete(updateId)
    return update.original || data
  }, [])

  const rollbackAll = useCallback((data: any, updateIds: string[]): any => {
    // Find the earliest update to rollback to
    let earliest: OptimisticUpdate | undefined
    
    for (const id of updateIds) {
      const update = updates.current.get(id)
      if (update && (!earliest || update.id < earliest.id)) {
        earliest = update
      }
    }
    
    // Clear all specified updates
    updateIds.forEach(id => updates.current.delete(id))
    
    return earliest?.original || data
  }, [])

  const commit = useCallback((updateId: string): void => {
    updates.current.delete(updateId)
  }, [])

  const resolveConflict = useCallback((
    local: any,
    server: any
  ): ConflictResolution => {
    // Simple timestamp-based resolution
    if (local.timestamp > server.timestamp) {
      return {
        completedReps: local.completedReps,
        source: 'local'
      }
    }
    
    return {
      completedReps: server.completedReps,
      source: 'server'
    }
  }, [])

  const smartMerge = useCallback((local: any, server: any): any => {
    if (!local || !server) return server || local

    // Deep merge that preserves local changes and adds server additions
    const merged = { ...server }

    // For exercises, merge by ID
    if (local.exercises && server.exercises) {
      const exerciseMap = new Map<string, any>()
      
      // Add all server exercises
      server.exercises.forEach((ex: any) => {
        exerciseMap.set(ex.id, ex)
      })
      
      // Merge local changes
      local.exercises.forEach((localEx: any) => {
        const serverEx = exerciseMap.get(localEx.id)
        if (serverEx) {
          // Merge sets
          const setMap = new Map<string, any>()
          
          serverEx.sets?.forEach((set: any) => {
            setMap.set(set.id, set)
          })
          
          localEx.sets?.forEach((localSet: any) => {
            if (localSet.completed) {
              // Keep local completion
              setMap.set(localSet.id, localSet)
            }
          })
          
          exerciseMap.set(localEx.id, {
            ...serverEx,
            sets: Array.from(setMap.values())
          })
        }
      })
      
      merged.exercises = Array.from(exerciseMap.values())
    }

    return merged
  }, [])

  return {
    applyOptimistic,
    rollback,
    rollbackAll,
    commit,
    resolveConflict,
    smartMerge
  }
}

// Deep merge helper
function mergeDeep(target: any, source: any): any {
  const output = { ...target }
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key]
        } else {
          output[key] = mergeDeep(target[key], source[key])
        }
      } else if (Array.isArray(source[key]) && Array.isArray(target[key])) {
        // For arrays, check if they contain objects with IDs
        if (source[key].length > 0 && source[key][0].id) {
          // Merge by ID
          const map = new Map()
          target[key].forEach((item: any) => map.set(item.id, item))
          source[key].forEach((item: any) => {
            if (map.has(item.id)) {
              map.set(item.id, mergeDeep(map.get(item.id), item))
            } else {
              map.set(item.id, item)
            }
          })
          output[key] = Array.from(map.values())
        } else {
          output[key] = source[key]
        }
      } else {
        output[key] = source[key]
      }
    })
  }
  
  return output
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item)
}