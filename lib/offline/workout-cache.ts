/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface WorkoutCacheDB extends DBSchema {
  workouts: {
    key: string
    value: {
      data: any
      timestamp: number
      expiry?: number
      version?: number
    }
  }
  'optimistic-updates': {
    key: string
    value: {
      id: string
      cacheKey: string
      original: any
      changes: any
      timestamp: number
    }
  }
}

interface OptimisticUpdate {
  path: (string | number)[]
  changes: any
}

export class WorkoutCache {
  private db: IDBPDatabase<WorkoutCacheDB> | null = null
  private memoryCache: Map<string, any> = new Map()
  private optimisticUpdates: Map<string, any[]> = new Map()

  async init() {
    if (this.db) return

    try {
      this.db = await openDB<WorkoutCacheDB>('workout-cache', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('workouts')) {
            db.createObjectStore('workouts')
          }
          if (!db.objectStoreNames.contains('optimistic-updates')) {
            db.createObjectStore('optimistic-updates')
          }
        }
      })
    } catch (error) {
      console.warn('IndexedDB not available, using memory cache')
      // Fall back to memory cache only
    }
  }

  async put(key: string, data: any, options?: { expiry?: number }): Promise<void> {
    await this.init()

    const entry = {
      data,
      timestamp: Date.now(),
      expiry: options?.expiry,
      version: data.version
    }

    if (this.db) {
      await this.db.put('workouts', entry, key)
    } else {
      this.memoryCache.set(key, entry)
    }
  }

  async get(key: string): Promise<any | null> {
    await this.init()

    let entry
    if (this.db) {
      entry = await this.db.get('workouts', key)
    } else {
      entry = this.memoryCache.get(key)
    }

    if (!entry) return null

    // Check expiry
    if (entry.expiry && Date.now() > entry.expiry) {
      await this.delete(key)
      return null
    }

    return entry.data
  }

  async delete(key: string): Promise<void> {
    await this.init()

    if (this.db) {
      await this.db.delete('workouts', key)
    } else {
      this.memoryCache.delete(key)
    }
  }

  async applyOptimisticUpdate(
    key: string,
    update: OptimisticUpdate
  ): Promise<string> {
    const current = await this.get(key)
    if (!current) throw new Error('Cannot apply update to non-existent cache entry')

    const updateId = `optimistic-${Date.now()}-${Math.random()}`
    const original = JSON.parse(JSON.stringify(current))

    // Apply update to nested path
    let target = current
    for (let i = 0; i < update.path.length - 1; i++) {
      target = target[update.path[i]]
    }
    
    const lastKey = update.path[update.path.length - 1]
    Object.assign(target[lastKey], update.changes)

    // Store the update for potential rollback
    const updates = this.optimisticUpdates.get(key) || []
    updates.push({
      id: updateId,
      original,
      changes: update.changes,
      path: update.path,
      timestamp: Date.now()
    })
    this.optimisticUpdates.set(key, updates)

    // Save updated data
    await this.put(key, current)

    return updateId
  }

  async rollbackOptimisticUpdate(key: string, updateId: string): Promise<void> {
    const updates = this.optimisticUpdates.get(key) || []
    const updateIndex = updates.findIndex(u => u.id === updateId)
    
    if (updateIndex === -1) return

    const update = updates[updateIndex]
    
    // Restore original data
    await this.put(key, update.original)

    // Remove this and all subsequent updates (they may depend on this one)
    updates.splice(updateIndex)
    this.optimisticUpdates.set(key, updates)
  }

  async commitOptimisticUpdate(key: string, updateId: string): Promise<void> {
    const updates = this.optimisticUpdates.get(key) || []
    const updateIndex = updates.findIndex(u => u.id === updateId)
    
    if (updateIndex === -1) return

    // Remove committed update from tracking
    updates.splice(updateIndex, 1)
    this.optimisticUpdates.set(key, updates)
  }

  async clear(): Promise<void> {
    await this.init()

    if (this.db) {
      const tx = this.db.transaction(['workouts', 'optimistic-updates'], 'readwrite')
      await Promise.all([
        tx.objectStore('workouts').clear(),
        tx.objectStore('optimistic-updates').clear()
      ])
    } else {
      this.memoryCache.clear()
    }
    
    this.optimisticUpdates.clear()
  }

  // Helper for conflict resolution
  mergeWithServer(local: any, server: any): any {
    // For single-user app, prefer local changes for current session
    // but accept server version number and any new fields
    
    const merged = { ...server }
    
    // If local has newer changes (by timestamp), keep them
    if (local._lastModified > server._lastModified) {
      // Keep local data but server version
      return {
        ...local,
        version: server.version,
        _serverFields: server._serverFields
      }
    }
    
    return server
  }
}