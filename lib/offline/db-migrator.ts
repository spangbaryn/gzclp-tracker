/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prefer-rest-params */
import { EventEmitter } from 'events'

interface MigrationOptions {
  migrations?: {
    [version: number]: (db: IDBDatabase) => void
  }
}

interface MigrationResult {
  success: boolean
  error?: Error
  rollbackAvailable?: boolean
}

interface BackupData {
  version: number
  data: any
  timestamp: Date
}

interface MigrationSafety {
  safe: boolean
  reason?: string
  deferUntil?: string
}

interface MigrationProgress {
  current: number
  total: number
  percentage: number
}

export class DatabaseMigrator extends EventEmitter {
  private backups: Map<string, BackupData[]> = new Map()

  async migrate(
    dbName: string,
    targetVersion: number,
    options: MigrationOptions = {}
  ): Promise<MigrationResult> {
    try {
      const db = await this.openDatabase(dbName, targetVersion, options)
      return { success: true }
    } catch (error) {
      const isVersionError = error instanceof DOMException && error.name === 'VersionError'
      
      if (isVersionError) {
        this.emit('resetRequired', {
          reason: 'version_conflict',
          currentVersion: undefined,
          targetVersion,
          action: {
            title: 'Database Reset Required',
            message: 'Your offline data needs to be reset to continue. This may happen after app updates.',
            options: ['backup_and_reset', 'reset_now', 'cancel']
          }
        })
      }

      return {
        success: false,
        error: error as Error,
        rollbackAvailable: this.hasBackup(dbName)
      }
    }
  }

  async backupAndMigrate(
    db: IDBDatabase,
    options: {
      from: number
      to: number
      transformer: (data: any) => any
    }
  ): Promise<void> {
    const transaction = db.transaction(db.objectStoreNames, 'readwrite')
    const backupData: any[] = []

    // Backup existing data
    for (let i = 0; i < db.objectStoreNames.length; i++) {
      const storeName = db.objectStoreNames[i]
      const store = transaction.objectStore(storeName)
      const data = await this.getAllFromStore(store)
      backupData.push({ store: storeName, data })
    }

    // Transform and re-insert data
    for (const backup of backupData) {
      const store = transaction.objectStore(backup.store)
      
      for (const item of backup.data) {
        const transformed = options.transformer(item)
        await this.addToStore(store, transformed)
      }
    }
  }

  async coordinateWithServiceWorker(action: {
    action: string
    version: number
  }): Promise<void> {
    if (!navigator.serviceWorker?.controller) return

    navigator.serviceWorker.controller.postMessage({
      type: 'db-migration',
      ...action
    })
  }

  async isSafeToMigrate(): Promise<boolean> {
    // Check if there's an active workout
    try {
      const cache = await this.getCache('workout-cache')
      const activeWorkout = await cache.get('active-workout')
      
      if (activeWorkout?.inProgress) {
        return false
      }
    } catch {
      // No active workout
    }

    return true
  }

  getMigrationBlockers(): string[] {
    const blockers: string[] = []
    
    // In a real implementation, check for:
    // - Active workout
    // - Pending sync items
    // - Ongoing timers
    
    return blockers
  }

  async migrateDataFormat(
    oldData: any,
    options: {
      from: string
      to: string
      changes: {
        removeUserIdReferences?: boolean
        flattenNestedData?: boolean
      }
    }
  ): Promise<any> {
    let migrated = { ...oldData, version: options.to }

    if (options.changes.removeUserIdReferences) {
      // Remove userId from all objects
      const removeUserId = (obj: any): any => {
        if (Array.isArray(obj)) {
          return obj.map(removeUserId)
        }
        if (obj && typeof obj === 'object') {
          const { userId, ...rest } = obj
          return Object.keys(rest).reduce((acc, key) => ({
            ...acc,
            [key]: removeUserId(rest[key])
          }), {})
        }
        return obj
      }
      migrated = removeUserId(migrated)
    }

    return migrated
  }

  async runMigrationChain(
    data: any,
    targetVersion: number,
    migrations: { [key: string]: (data: any) => any }
  ): Promise<any> {
    let currentData = data
    let currentVersion = data.version || 1

    while (currentVersion < targetVersion) {
      const nextVersion = currentVersion + 1
      const migrationKey = `${currentVersion}->${nextVersion}`
      
      if (migrations[migrationKey]) {
        currentData = migrations[migrationKey](currentData)
        currentData.version = nextVersion
      }
      
      currentVersion = nextVersion
    }

    return currentData
  }

  async checkMigrationSafety(context: {
    pendingSync: any[]
    offline: boolean
  }): Promise<MigrationSafety> {
    if (context.offline && context.pendingSync.length > 0) {
      return {
        safe: false,
        reason: 'Cannot migrate while offline with pending sync items',
        deferUntil: 'online_with_sync_complete'
      }
    }

    return { safe: true }
  }

  async performRiskyMigration(options: {
    version: number
    risk: string
    changes: string[]
  }): Promise<void> {
    // Export current database as backup
    const backup = await this.exportDatabase()
    await this.storeBackup('pre-migration', backup)

    // Proceed with migration
    // Implementation would continue here
  }

  async migrateCollection(
    data: any[],
    options: {
      batchSize: number
      transform: (item: any) => any
    }
  ): Promise<any[]> {
    const result: any[] = []
    const total = data.length

    for (let i = 0; i < data.length; i += options.batchSize) {
      const batch = data.slice(i, i + options.batchSize)
      const transformed = batch.map(options.transform)
      result.push(...transformed)

      // Emit progress
      this.emit('migrationProgress', {
        current: Math.min(i + options.batchSize, total),
        total,
        percentage: Math.round((Math.min(i + options.batchSize, total) / total) * 100)
      })

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0))
    }

    return result
  }

  exportDatabase = async (): Promise<BackupData> => {
    // Simplified implementation
    return {
      version: 1,
      data: { workouts: [] },
      timestamp: new Date()
    }
  }

  async getBackups(): Promise<BackupData[]> {
    return Array.from(this.backups.values()).flat()
  }

  // Helper methods
  private async openDatabase(
    name: string,
    version: number,
    options: MigrationOptions
  ): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(name, version)

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result
        const oldVersion = event.oldVersion
        const newVersion = event.newVersion

        if (options.migrations && options.migrations[newVersion]) {
          options.migrations[newVersion](db)
        }
      }
    })
  }

  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  private async addToStore(store: IDBObjectStore, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.add(data)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  private async getCache(name: string): Promise<any> {
    // Simplified cache retrieval
    return {
      get: async (key: string) => null
    }
  }

  private async storeBackup(key: string, backup: BackupData): Promise<void> {
    const existing = this.backups.get(key) || []
    existing.push(backup)
    
    // Keep only last 5 backups
    if (existing.length > 5) {
      existing.shift()
    }
    
    this.backups.set(key, existing)
  }

  private hasBackup(dbName: string): boolean {
    return this.backups.has(dbName)
  }

  // Error handling
  on(event: 'resetRequired', listener: (data: any) => void): this
  on(event: 'migrationProgress', listener: (progress: MigrationProgress) => void): this
  on(event: 'migrationError', listener: (error: any) => void): this
  on(event: string, listener: (...args: any[]) => void): this {
    super.on(event, listener)
    
    // Special handling for migration errors
    if (event === 'error') {
      const error = arguments[1]
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.emit('migrationError', {
          error: 'quota_exceeded',
          message: 'Not enough storage space for migration',
          solution: 'Clear some data or enable persistent storage',
          canRetry: true
        })
      }
    }
    
    return this
  }
}