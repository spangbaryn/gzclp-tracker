# Offline-First Implementation Plan v2 (Post-o3 Review)

## Test Coverage ✅

### Core Tests (Original)
1. **Offline Data Access** - Caching, queuing, optimistic updates
2. **Service Worker Strategies** - Cache-first, network-first, stale-while-revalidate
3. **Optimistic UI Updates** - SWR integration, rollback, concurrent updates
4. **Background Sync** - Queue persistence, retry logic, priority processing

### Critical Additions (From o3 Review)
5. **Timer Persistence** - Rest timers, AMRAP timers, mid-workout loss, day rollover
6. **Capability Detection** - Service worker availability, fallback strategies
7. **Network Verification** - Real connectivity checks, not just navigator.onLine
8. **IndexedDB Migrations** - Schema updates without data loss
9. **Conflict Resolution** - Server/client merge strategies

## Implementation Priority (Updated)

### Phase 1: Defensive Foundation
1. **OfflineCapabilities** (`lib/offline/capabilities.ts`)
   ```typescript
   - Detect service worker, background sync, IndexedDB support
   - Provide fallback strategies for iOS Safari, private mode
   - Graceful degradation for missing features
   ```

2. **NetworkMonitor** (`lib/offline/network-monitor.ts`)
   ```typescript
   - Real connectivity checks with /api/ping
   - Connection quality monitoring
   - Adaptive sync strategies based on network
   ```

### Phase 2: Data Layer with Migrations
3. **DatabaseMigrator** (`lib/offline/db-migrator.ts`)
   ```typescript
   - Safe schema migrations
   - Data backup before risky changes
   - Rollback capability
   - Progress reporting for large migrations
   ```

4. **WorkoutCache** (`lib/offline/workout-cache.ts`)
   ```typescript
   - Single-user optimized (no userId)
   - Built-in migration support
   - Optimistic update tracking
   - Conflict resolution helpers
   ```

### Phase 3: Timer & State Persistence
5. **TimerManager** (`lib/offline/timer-manager.ts`)
   ```typescript
   - Persist active timers to IndexedDB
   - Handle app suspension/visibility changes
   - Audio/vibration fallbacks
   - Day rollover protection
   ```

### Phase 4: Smart Sync with Jitter
6. **BackgroundSyncManager** (`lib/offline/background-sync.ts`)
   ```typescript
   - Exponential backoff WITH jitter
   - User notification on permanent failure
   - Priority-based processing
   - Multi-tab coordination
   ```

7. **ServiceWorkerCache** (`lib/offline/service-worker-cache.ts`)
   ```typescript
   - Dual-bucket strategy (static vs runtime)
   - Critical asset pinning
   - LRU eviction for runtime cache
   - Must-keep allowlist
   ```

### Phase 5: React Integration
8. **useWorkout Hook** (`hooks/use-workout.ts`)
   ```typescript
   - SWR with conflict resolution
   - Smart merge for server updates
   - Timer state integration
   - Network-aware sync
   ```

9. **useOfflineStatus Hook** (`hooks/use-offline-status.ts`)
   ```typescript
   - Real connectivity status
   - Pending sync count
   - Failed item notifications
   - Storage quota warnings
   ```

## Key Improvements from o3 Review

### 1. Robust Capability Detection
```typescript
// Before: Crashes on iOS Safari
navigator.serviceWorker.register('/sw.js')

// After: Graceful fallback
if ('serviceWorker' in navigator) {
  try {
    await navigator.serviceWorker.register('/sw.js')
  } catch {
    // Use localStorage queue fallback
  }
}
```

### 2. Real Network Detection
```typescript
// Before: Lies about connectivity
if (navigator.onLine) { sync() }

// After: Actual connectivity check
const isReallyOnline = await fetch('/api/ping', {
  signal: AbortSignal.timeout(2000)
}).then(() => true).catch(() => false)
```

### 3. Jittered Backoff
```typescript
// Before: Thundering herd
delay = Math.pow(2, attempt) * 1000

// After: Distributed retry
delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
```

### 4. Critical Asset Protection
```typescript
// Never evict these
const CRITICAL_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/offline.html'
]
```

### 5. Single-User Optimizations
- Remove all userId references
- Last-write-wins conflict resolution
- Simplified retry UI (single badge)
- No complex merge strategies needed

## Testing Strategy

### Run Tests in Order
```bash
# 1. Core functionality
npm test __tests__/offline/data-access.test.ts
npm test __tests__/offline/service-worker.test.ts

# 2. Workout-specific features
npm test __tests__/offline/timer-persistence.test.ts
npm test __tests__/offline/network-connectivity.test.ts

# 3. Robustness
npm test __tests__/offline/capability-detection.test.ts
npm test __tests__/offline/indexeddb-migration.test.ts

# 4. Integration
npm test __tests__/offline/optimistic-updates.test.tsx
npm test __tests__/offline/background-sync.test.ts
```

## Configuration

```bash
# Dependencies
npm install swr idb
npm install --save-dev next-pwa@^5

# Environment detection
npm install ua-parser-js  # For capability detection
```

## Migration Path for Existing Users

1. Detect old data format on first load
2. Show migration banner with progress
3. Backup to localStorage before migration
4. Migrate in batches with progress updates
5. Verify data integrity after migration
6. Clear backup after 7 days

## Performance Targets

- Initial cache population: < 2s
- Timer restore after reload: < 100ms
- Optimistic update latency: < 16ms
- Background sync batch size: 10-50 items
- Cache size limit: 50MB (configurable)

## Browser Support Matrix

| Feature | Chrome | Safari | Firefox | iOS Safari |
|---------|--------|--------|---------|------------|
| Service Worker | ✅ | ✅ | ✅ | ⚠️ Limited |
| Background Sync | ✅ | ❌ | ❌ | ❌ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Persistent Storage | ✅ | ❌ | ✅ | ❌ |

Fallbacks ensure 100% functionality across all browsers.