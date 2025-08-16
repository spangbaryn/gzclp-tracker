import { EventEmitter } from 'events'
import { openDB, DBSchema, IDBPDatabase } from 'idb'

interface SyncItem {
  id: string
  type: string
  data: any
  timestamp: number
  attempts: number
  maxRetries: number
  priority?: 'high' | 'medium' | 'low'
  lastAttempt?: number
}

interface BackgroundSyncDB extends DBSchema {
  'sync-queue': {
    key: string
    value: SyncItem
  }
  'failed-items': {
    key: string
    value: SyncItem & { failedAt: number; error: string }
  }
}

export interface SyncEvent extends Event {
  tag: string
  waitUntil: (promise: Promise<any>) => void
}

type SyncProcessor = (item: any) => Promise<{ success: boolean }>

export class BackgroundSyncManager extends EventEmitter {
  private db: IDBPDatabase<BackgroundSyncDB> | null = null
  private processor: SyncProcessor | null = null
  private retryTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    super()
    this.init()
  }

  private async init() {
    try {
      this.db = await openDB<BackgroundSyncDB>('background-sync', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('sync-queue')) {
            db.createObjectStore('sync-queue')
          }
          if (!db.objectStoreNames.contains('failed-items')) {
            db.createObjectStore('failed-items')
          }
        }
      })
    } catch (error) {
      console.warn('Failed to open sync database')
    }
  }

  setProcessor(processor: SyncProcessor) {
    this.processor = processor
  }

  async register(syncData: { type: string; data: any }): Promise<void> {
    if (navigator.onLine && this.processor) {
      // Process immediately if online
      try {
        const result = await this.processor(syncData)
        if (!result.success) {
          await this.addToQueue(syncData)
        }
      } catch {
        await this.addToQueue(syncData)
      }
    } else {
      // Queue for later
      await this.addToQueue(syncData)
      
      // Try to register background sync
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        try {
          const registration = await navigator.serviceWorker.ready
          if ('sync' in registration) {
            await (registration as any).sync.register('workout-sync')
          }
        } catch (error) {
          console.warn('Background sync registration failed:', error)
        }
      }
    }
  }

  async addToQueue(item: { type: string; data: any; maxRetries?: number; priority?: string }): Promise<void> {
    const syncItem: SyncItem = {
      id: `sync-${Date.now()}-${Math.random()}`,
      type: item.type,
      data: item.data,
      timestamp: Date.now(),
      attempts: 0,
      maxRetries: item.maxRetries || 3,
      priority: item.priority as any || 'medium'
    }

    if (this.db) {
      await this.db.put('sync-queue', syncItem, syncItem.id)
    }
  }

  async getQueuedItems(): Promise<SyncItem[]> {
    if (!this.db) return []
    
    const items = await this.db.getAll('sync-queue')
    
    // Sort by priority then timestamp
    return items.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority
      }
      
      return a.timestamp - b.timestamp
    })
  }

  async processQueue(): Promise<void> {
    if (!this.processor || !this.db) return

    const items = await this.getQueuedItems()

    for (const item of items) {
      try {
        const result = await this.processor(item)
        
        if (result.success) {
          await this.db.delete('sync-queue', item.id)
        } else {
          await this.handleFailedItem(item)
        }
      } catch (error) {
        await this.handleFailedItem(item, error)
      }
    }
  }

  private async handleFailedItem(item: SyncItem, error?: any) {
    item.attempts++
    item.lastAttempt = Date.now()

    if (item.attempts >= item.maxRetries) {
      // Move to failed queue and notify
      await this.moveToFailed(item, error)
      
      this.emit('permanentFailure', {
        item,
        error,
        attempts: item.attempts,
        userAction: {
          title: 'Sync Failed',
          message: `Failed to sync ${item.type === 'workout-complete' ? 'workout' : item.type}`,
          actions: ['retry', 'dismiss']
        }
      })
    } else {
      // Schedule retry with exponential backoff + jitter
      const baseDelay = Math.pow(2, item.attempts - 1) * 1000
      const jitter = Math.random() * (baseDelay / 2)
      const delay = baseDelay + jitter

      // Emit event for testing
      this.emit('retryScheduled', delay)

      // Update item in queue
      if (this.db) {
        await this.db.put('sync-queue', item, item.id)
      }

      // Schedule retry
      const timer = setTimeout(() => {
        this.retrySingleItem(item)
      }, delay)
      
      this.retryTimers.set(item.id, timer)
    }
  }

  private async retrySingleItem(item: SyncItem) {
    if (!this.processor) return

    try {
      const result = await this.processor(item)
      if (result.success && this.db) {
        await this.db.delete('sync-queue', item.id)
      } else {
        await this.handleFailedItem(item)
      }
    } catch (error) {
      await this.handleFailedItem(item, error)
    }
  }

  private async moveToFailed(item: SyncItem, error?: any) {
    if (!this.db) return

    const failedItem = {
      ...item,
      failedAt: Date.now(),
      error: error?.message || 'Unknown error'
    }

    await this.db.put('failed-items', failedItem, item.id)
    await this.db.delete('sync-queue', item.id)
  }

  async getFailedItems(): Promise<SyncItem[]> {
    if (!this.db) return []
    return this.db.getAll('failed-items')
  }

  async handleSyncEvent(event: SyncEvent): Promise<void> {
    if (event.tag === 'workout-sync') {
      event.waitUntil(this.processQueue())
    }
  }

  // Workout-specific methods
  async syncWorkoutCompletion(workoutData: any): Promise<void> {
    await this.addToQueue({
      type: 'workout-complete',
      data: workoutData,
      priority: 'high'
    })
  }

  async syncSetUpdate(setData: any): Promise<void> {
    await this.addToQueue({
      type: 'set-update',
      data: setData,
      priority: 'low'
    })
  }

  async batchPendingUpdates(): Promise<void> {
    const items = await this.getQueuedItems()
    const setUpdates = items.filter(item => item.type === 'set-update')
    
    if (setUpdates.length > 1) {
      // Remove individual updates
      for (const update of setUpdates) {
        if (this.db) {
          await this.db.delete('sync-queue', update.id)
        }
      }
      
      // Add batched update
      await this.addToQueue({
        type: 'batch-set-updates',
        data: {
          updates: setUpdates.map(u => u.data)
        },
        priority: 'medium'
      })
    }
  }

  // Cleanup
  cleanup() {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer)
    }
    this.retryTimers.clear()
  }
}