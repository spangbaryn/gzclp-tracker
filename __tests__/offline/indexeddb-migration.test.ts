import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseMigrator } from '@/lib/offline/db-migrator'
import { WorkoutCache } from '@/lib/offline/workout-cache'

// Mock IndexedDB
const mockIDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn()
}

global.indexedDB = mockIDB as any

describe('IndexedDB Migration and Schema Updates', () => {
  let migrator: DatabaseMigrator
  
  beforeEach(() => {
    vi.clearAllMocks()
    migrator = new DatabaseMigrator()
  })

  describe('Version Migrations', () => {
    it('should handle database version upgrades', async () => {
      const mockDB = {
        version: 1,
        objectStoreNames: ['workouts'],
        createObjectStore: vi.fn(),
        transaction: vi.fn()
      }
      
      const mockRequest = {
        onsuccess: null as any,
        onerror: null as any,
        onupgradeneeded: null as any,
        result: mockDB
      }
      
      mockIDB.open.mockReturnValue(mockRequest)
      
      // Simulate upgrade needed
      setTimeout(() => {
        if (mockRequest.onupgradeneeded) {
          mockRequest.onupgradeneeded({
            oldVersion: 1,
            newVersion: 2,
            target: { result: mockDB }
          })
        }
      }, 0)
      
      const result = await migrator.migrate('workout-cache', 2, {
        migrations: {
          2: (db) => {
            // Add new object store
            if (!db.objectStoreNames.contains('timers')) {
              db.createObjectStore('timers', { keyPath: 'id' })
            }
          }
        }
      })
      
      expect(mockDB.createObjectStore).toHaveBeenCalledWith('timers', { keyPath: 'id' })
      expect(result.success).toBe(true)
    })

    it('should preserve existing data during migration', async () => {
      const existingData = [
        { id: 'workout-1', type: 'A1', date: '2024-01-01' },
        { id: 'workout-2', type: 'B1', date: '2024-01-02' }
      ]
      
      const mockObjectStore = {
        getAll: vi.fn().mockResolvedValue(existingData),
        add: vi.fn(),
        delete: vi.fn()
      }
      
      const mockTransaction = {
        objectStore: vi.fn().mockReturnValue(mockObjectStore)
      }
      
      const mockDB = {
        version: 1,
        transaction: vi.fn().mockReturnValue(mockTransaction),
        objectStoreNames: ['workouts']
      }
      
      await migrator.backupAndMigrate(mockDB, {
        from: 1,
        to: 2,
        transformer: (data) => ({
          ...data,
          version: 2,
          migratedAt: new Date()
        })
      })
      
      // Should backup existing data
      expect(mockObjectStore.getAll).toHaveBeenCalled()
      
      // Should transform and re-insert
      expect(mockObjectStore.add).toHaveBeenCalledTimes(2)
      expect(mockObjectStore.add).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'workout-1',
          version: 2,
          migratedAt: expect.any(Date)
        })
      )
    })

    it('should handle migration failures with rollback', async () => {
      const mockDB = {
        version: 2,
        close: vi.fn()
      }
      
      // Simulate migration error
      const error = new Error('Migration failed')
      mockIDB.open.mockImplementation(() => {
        throw error
      })
      
      const result = await migrator.migrate('workout-cache', 3, {
        migrations: {
          3: () => { throw new Error('Schema change failed') }
        }
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.rollbackAvailable).toBe(true)
    })

    it('should provide safe reset option when migration is impossible', async () => {
      // Simulate corrupted database
      mockIDB.open.mockRejectedValue(new DOMException('VersionError'))
      
      const onResetRequired = vi.fn()
      migrator.on('resetRequired', onResetRequired)
      
      const result = await migrator.migrate('workout-cache', 2)
      
      expect(onResetRequired).toHaveBeenCalledWith({
        reason: 'version_conflict',
        currentVersion: undefined,
        targetVersion: 2,
        action: expect.objectContaining({
          title: 'Database Reset Required',
          message: expect.stringContaining('reset your offline data'),
          options: ['backup_and_reset', 'reset_now', 'cancel']
        })
      })
    })
  })

  describe('Service Worker Update Coordination', () => {
    it('should coordinate database migration with service worker update', async () => {
      const mockSW = {
        postMessage: vi.fn(),
        state: 'activated'
      }
      
      navigator.serviceWorker = {
        controller: mockSW,
        ready: Promise.resolve({ active: mockSW })
      } as any
      
      await migrator.coordinateWithServiceWorker({
        action: 'migrate',
        version: 2
      })
      
      expect(mockSW.postMessage).toHaveBeenCalledWith({
        type: 'db-migration',
        action: 'migrate',
        version: 2
      })
    })

    it('should wait for safe migration window', async () => {
      const cache = new WorkoutCache()
      
      // Simulate active workout
      await cache.put('active-workout', { id: 'workout-1', inProgress: true })
      
      const canMigrate = await migrator.isSafeToMigrate()
      
      expect(canMigrate).toBe(false)
      expect(migrator.getMigrationBlockers()).toContain('active_workout')
    })
  })

  describe('Data Format Migrations', () => {
    it('should migrate from old single-user format to new format', async () => {
      const oldData = {
        workouts: [
          { id: '1', type: 'A1', exercises: [] }
        ],
        settings: { currentWorkout: 0 }
      }
      
      const migrated = await migrator.migrateDataFormat(oldData, {
        from: 'v1',
        to: 'v2',
        changes: {
          // Remove userId since single-user
          removeUserIdReferences: true,
          // Flatten structure
          flattenNestedData: true
        }
      })
      
      expect(migrated.workouts[0]).not.toHaveProperty('userId')
      expect(migrated.version).toBe('v2')
    })

    it('should handle incremental migrations through multiple versions', async () => {
      const migrations = {
        '1->2': (data: any) => ({ ...data, v2: true }),
        '2->3': (data: any) => ({ ...data, v3: true }),
        '3->4': (data: any) => ({ ...data, v4: true })
      }
      
      const result = await migrator.runMigrationChain(
        { version: 1, data: 'test' },
        4,
        migrations
      )
      
      expect(result.v2).toBe(true)
      expect(result.v3).toBe(true)
      expect(result.v4).toBe(true)
      expect(result.version).toBe(4)
    })
  })

  describe('Offline Migration Safety', () => {
    it('should defer migration if offline with pending changes', async () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
      
      // Simulate pending sync items
      const pendingItems = [
        { type: 'workout-complete', data: {} }
      ]
      
      const result = await migrator.checkMigrationSafety({
        pendingSync: pendingItems,
        offline: true
      })
      
      expect(result.safe).toBe(false)
      expect(result.reason).toContain('pending sync')
      expect(result.deferUntil).toBe('online_with_sync_complete')
    })

    it('should backup database before risky migrations', async () => {
      const mockExport = vi.fn().mockResolvedValue({
        version: 1,
        data: { workouts: [] },
        timestamp: new Date()
      })
      
      migrator.exportDatabase = mockExport
      
      await migrator.performRiskyMigration({
        version: 2,
        risk: 'high',
        changes: ['schema_restructure']
      })
      
      expect(mockExport).toHaveBeenCalled()
      
      // Verify backup was stored
      const backups = await migrator.getBackups()
      expect(backups).toHaveLength(1)
      expect(backups[0].version).toBe(1)
    })
  })

  describe('User Communication', () => {
    it('should show migration progress for large databases', async () => {
      const onProgress = vi.fn()
      migrator.on('migrationProgress', onProgress)
      
      // Simulate large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `workout-${i}`,
        exercises: []
      }))
      
      await migrator.migrateCollection(largeData, {
        batchSize: 100,
        transform: (item) => ({ ...item, migrated: true })
      })
      
      // Should emit progress events
      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          current: expect.any(Number),
          total: 1000,
          percentage: expect.any(Number)
        })
      )
      
      // Should have been called multiple times for batches
      expect(onProgress.mock.calls.length).toBeGreaterThan(5)
    })

    it('should provide clear error messages for migration failures', async () => {
      const onError = vi.fn()
      migrator.on('migrationError', onError)
      
      // Simulate specific error
      const error = new DOMException('QuotaExceededError')
      mockIDB.open.mockRejectedValue(error)
      
      await migrator.migrate('workout-cache', 2)
      
      expect(onError).toHaveBeenCalledWith({
        error: 'quota_exceeded',
        message: 'Not enough storage space for migration',
        solution: 'Clear some data or enable persistent storage',
        canRetry: true
      })
    })
  })
})