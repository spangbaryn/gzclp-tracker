/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { openDB, DBSchema, IDBPDatabase } from 'idb'
import { OfflineCapabilities } from './capabilities'

interface QueueItem {
  id: string
  type: string
  data: any
  timestamp: number
  attempts: number
  maxRetries?: number
  priority?: 'high' | 'medium' | 'low'
}

interface OfflineQueueDB extends DBSchema {
  queue: {
    key: string
    value: QueueItem
  }
  failed: {
    key: string
    value: QueueItem & { failedAt: number; error: string }
  }
}

type QueueProcessor = (item: any) => Promise<{ success: boolean }>

export class OfflineQueue {
  private db: IDBPDatabase<OfflineQueueDB> | null = null
  private processor: QueueProcessor | null = null
  private capabilities: OfflineCapabilities
  private localStorageKey = 'offline-queue'
  private isProcessing = false

  constructor() {
    this.capabilities = new OfflineCapabilities()
    this.init()
    this.setupOnlineListener()
  }

  private async init() {
    if (this.capabilities.hasIndexedDBSupport()) {
      try {
        this.db = await openDB<OfflineQueueDB>('offline-queue', 1, {
          upgrade(db) {
            if (!db.objectStoreNames.contains('queue')) {
              db.createObjectStore('queue')
            }
            if (!db.objectStoreNames.contains('failed')) {
              db.createObjectStore('failed')
            }
          }
        })
      } catch (error) {
        console.warn('Failed to open IndexedDB, falling back to localStorage')
      }
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', async () => {
      // Process queue when coming back online
      if (!this.isProcessing) {
        await this.processAll()
      }
    })
  }

  setProcessor(processor: QueueProcessor) {
    this.processor = processor
  }

  async add(item: Omit<QueueItem, 'id' | 'timestamp' | 'attempts'>): Promise<void> {
    const queueItem: QueueItem = {
      ...item,
      id: `queue-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      attempts: 0,
      maxRetries: item.maxRetries || 3
    }

    if (this.db) {
      await this.db.put('queue', queueItem, queueItem.id)
    } else {
      // Fallback to localStorage
      const queue = this.getLocalStorageQueue()
      queue.push(queueItem)
      this.saveLocalStorageQueue(queue)
    }

    // Try to sync if online and background sync not available
    if (navigator.onLine && !this.capabilities.hasBackgroundSyncSupport()) {
      // Try to register background sync if available
      if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
        try {
          const registration = await navigator.serviceWorker.ready
          if ('sync' in registration) {
            await (registration as any).sync.register('workout-sync')
            return
          }
        } catch {
          // Background sync not available or failed
        }
      }
      
      // Process immediately if online
      await this.processAll()
    }
  }

  async getAll(): Promise<QueueItem[]> {
    if (this.db) {
      const items = await this.db.getAll('queue')
      return items.sort((a, b) => {
        // Sort by priority then timestamp
        const priorityOrder = { high: 0, medium: 1, low: 2 }
        const aPriority = priorityOrder[a.priority || 'medium']
        const bPriority = priorityOrder[b.priority || 'medium']
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }
        
        return a.timestamp - b.timestamp
      })
    } else {
      return this.getLocalStorageQueue()
    }
  }

  async processAll(): Promise<void> {
    if (!this.processor || this.isProcessing) return

    this.isProcessing = true
    const items = await this.getAll()

    for (const item of items) {
      try {
        const result = await this.processor(item)
        
        if (result.success) {
          await this.remove(item.id)
        } else {
          await this.handleFailure(item)
        }
      } catch (error) {
        await this.handleFailure(item, error)
      }
    }

    this.isProcessing = false
  }

  private async handleFailure(item: QueueItem, error?: any) {
    item.attempts++

    if (item.attempts >= (item.maxRetries || 3)) {
      // Move to failed queue
      await this.moveToFailed(item, error)
    } else {
      // Update attempt count
      if (this.db) {
        await this.db.put('queue', item, item.id)
      } else {
        const queue = this.getLocalStorageQueue()
        const index = queue.findIndex(q => q.id === item.id)
        if (index >= 0) {
          queue[index] = item
          this.saveLocalStorageQueue(queue)
        }
      }
    }
  }

  private async moveToFailed(item: QueueItem, error?: any) {
    const failedItem = {
      ...item,
      failedAt: Date.now(),
      error: error?.message || 'Unknown error'
    }

    if (this.db) {
      await this.db.put('failed', failedItem, item.id)
      await this.db.delete('queue', item.id)
    } else {
      // Update localStorage
      const queue = this.getLocalStorageQueue()
      const index = queue.findIndex(q => q.id === item.id)
      if (index >= 0) {
        queue.splice(index, 1)
        this.saveLocalStorageQueue(queue)
      }
      
      // Store in failed items
      const failed = this.getLocalStorageFailedItems()
      failed.push(failedItem)
      localStorage.setItem('offline-queue-failed', JSON.stringify(failed))
    }
  }

  async getFailedItems(): Promise<QueueItem[]> {
    if (this.db) {
      return await this.db.getAll('failed')
    } else {
      return this.getLocalStorageFailedItems()
    }
  }

  private async remove(id: string) {
    if (this.db) {
      await this.db.delete('queue', id)
    } else {
      const queue = this.getLocalStorageQueue()
      const filtered = queue.filter(item => item.id !== id)
      this.saveLocalStorageQueue(filtered)
    }
  }

  private getLocalStorageQueue(): QueueItem[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  private saveLocalStorageQueue(queue: QueueItem[]) {
    localStorage.setItem(this.localStorageKey, JSON.stringify(queue))
  }

  private getLocalStorageFailedItems(): any[] {
    try {
      const stored = localStorage.getItem('offline-queue-failed')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
}