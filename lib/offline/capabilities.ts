import { EventEmitter } from 'events'

interface CapabilityStrategy {
  cache: 'indexeddb' | 'localStorage' | 'memory'
  sync: 'background-sync' | 'online-event' | 'manual'
  persist: 'persistent' | 'session'
  notifications: 'push' | 'in-app'
}

interface CapabilityChangeEvent {
  capability: string
  available: boolean
}

export class OfflineCapabilities extends EventEmitter {
  private capabilities: Map<string, boolean> = new Map()
  private fallbackStrategy: string = 'localStorage'

  constructor() {
    super()
    this.detectCapabilities()
    this.setupChangeListeners()
  }

  private detectCapabilities() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      // Server-side: set all capabilities to false
      this.capabilities.set('serviceWorker', false)
      this.capabilities.set('backgroundSync', false)
      this.capabilities.set('indexedDB', false)
      this.capabilities.set('notifications', false)
      this.capabilities.set('persistentStorage', false)
      return
    }
    
    this.capabilities.set('serviceWorker', 'serviceWorker' in navigator)
    this.capabilities.set('backgroundSync', 'SyncManager' in window)
    this.capabilities.set('indexedDB', 'indexedDB' in window)
    this.capabilities.set('notifications', 'Notification' in window)
    this.capabilities.set('persistentStorage', 'storage' in navigator && 'persist' in navigator.storage!)
  }

  private setupChangeListeners() {
    // Skip on server-side
    if (typeof window === 'undefined') return
    
    // Listen for permission changes
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName })
        .then(permission => {
          permission.addEventListener('change', () => {
            this.checkCapabilityChanges()
          })
        })
        .catch(() => {})
    }
  }

  hasServiceWorkerSupport(): boolean {
    return this.capabilities.get('serviceWorker') || false
  }

  hasBackgroundSyncSupport(): boolean {
    return this.capabilities.get('backgroundSync') || false
  }

  hasIndexedDBSupport(): boolean {
    return this.capabilities.get('indexedDB') || false
  }

  async canShowNotifications(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    return Notification.permission === 'granted'
  }

  async registerServiceWorker(): Promise<boolean> {
    if (!this.hasServiceWorkerSupport()) {
      this.fallbackStrategy = 'localStorage'
      return false
    }

    try {
      await navigator.serviceWorker.register('/sw.js')
      return true
    } catch (error) {
      console.warn('Service worker registration failed:', error)
      this.fallbackStrategy = 'localStorage'
      return false
    }
  }

  getFallbackStrategy(): string {
    return this.fallbackStrategy
  }

  getAlertStrategy(): 'push' | 'in-app' {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'in-app'
    return Notification.permission === 'granted' ? 'push' : 'in-app'
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (!('storage' in navigator) || !('persist' in navigator.storage!)) {
      return false
    }

    try {
      return await navigator.storage.persist()
    } catch {
      return false
    }
  }

  getStorageWarning(): string {
    if (!this.capabilities.get('persistentStorage')) {
      return 'Storage may be cleared by the browser when space is needed'
    }
    return ''
  }

  async getStorageStrategy(): Promise<{ type: string; persistent: boolean }> {
    if (!this.hasIndexedDBSupport()) {
      return { type: 'localStorage', persistent: false }
    }

    try {
      // Try to open IndexedDB
      const testDB = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('test-db')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      testDB.close()
      await indexedDB.deleteDatabase('test-db')
      
      return { type: 'indexeddb', persistent: true }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        return { type: 'memory', persistent: false }
      }
      return { type: 'localStorage', persistent: false }
    }
  }

  getOptimalStrategy(): CapabilityStrategy {
    if (typeof window === 'undefined') {
      return {
        cache: 'memory',
        sync: 'manual',
        persist: 'session',
        notifications: 'in-app'
      }
    }
    
    const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                        !('MSStream' in window) &&
                        /Safari/.test(navigator.userAgent)

    if (isIOSSafari || !this.hasServiceWorkerSupport()) {
      return {
        cache: 'localStorage',
        sync: 'online-event',
        persist: 'session',
        notifications: 'in-app'
      }
    }

    // Modern browser with full support
    if (this.hasServiceWorkerSupport() && this.hasBackgroundSyncSupport() && this.hasIndexedDBSupport()) {
      return {
        cache: 'indexeddb',
        sync: 'background-sync',
        persist: 'persistent',
        notifications: 'push'
      }
    }

    // Partial support
    return {
      cache: this.hasIndexedDBSupport() ? 'indexeddb' : 'localStorage',
      sync: this.hasBackgroundSyncSupport() ? 'background-sync' : 'online-event',
      persist: 'session',
      notifications: 'in-app'
    }
  }

  async checkCapabilityChanges() {
    const notificationPermission = await this.canShowNotifications()
    const previousValue = this.capabilities.get('notifications-granted')
    
    if (notificationPermission !== previousValue) {
      this.capabilities.set('notifications-granted', notificationPermission)
      this.emit('capabilityChange', {
        capability: 'notifications',
        available: notificationPermission
      })
    }
  }

  onCapabilityChange(callback: (event: CapabilityChangeEvent) => void) {
    this.on('capabilityChange', callback)
  }
}