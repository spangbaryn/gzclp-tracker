// Types for offline functionality

export interface QueueItem {
  id: string
  type: string
  data: Record<string, unknown>
  priority?: number
  maxRetries?: number
  attempts?: number
  createdAt?: number
  metadata?: Record<string, unknown>
}

export interface SyncResult {
  success: boolean
  error?: Error
  data?: unknown
}

export interface OptimisticUpdate {
  path: string[]
  changes: Record<string, unknown>
  rollbackData?: unknown
}

export interface TimerData {
  timerId: string
  workoutId: string
  exerciseId: string
  setId: string
  duration: number
  startTime: number
  pausedAt?: number
  pausedDuration: number
  state: 'running' | 'paused' | 'completed' | 'cancelled'
  onComplete?: () => void
}

export interface MigrationFunction {
  (db: IDBDatabase, transaction: IDBTransaction): void
}

export interface ProcessorFunction {
  (item: QueueItem): Promise<SyncResult>
}

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  metadata?: Record<string, unknown>
}