# Offline-First Implementation Plan (TDD)

## Tests Written ✅

### 1. Offline Data Access (`__tests__/offline/data-access.test.ts`)
- WorkoutCache for local storage with expiration
- OfflineQueue for mutation queuing
- Optimistic updates with rollback capability

### 2. Service Worker Caching (`__tests__/offline/service-worker.test.ts`)
- Cache-first strategy for static assets
- Network-first strategy for API calls
- Stale-while-revalidate for user data
- Cache management and expiration

### 3. Optimistic UI Updates (`__tests__/offline/optimistic-updates.test.tsx`)
- useWorkout hook with SWR integration
- Immediate UI updates with background sync
- Rollback on failure
- Concurrent update handling

### 4. Background Sync (`__tests__/offline/background-sync.test.ts`)
- Queue persistence in IndexedDB
- Exponential backoff retry logic
- Priority-based processing
- Batch optimization for multiple updates

## Implementation Order

### Phase 1: Core Offline Infrastructure
1. **WorkoutCache** (`lib/offline/workout-cache.ts`)
   - IndexedDB wrapper for structured data
   - Expiration handling
   - Optimistic update tracking

2. **OfflineQueue** (`lib/offline/offline-queue.ts`)
   - Queue mutations when offline
   - Process queue when online
   - Retry with backoff

### Phase 2: Service Worker
3. **ServiceWorkerCache** (`lib/offline/service-worker-cache.ts`)
   - Route-based caching strategies
   - Cache versioning
   - Cleanup routines

4. **Service Worker** (`public/sw.js`)
   - Register caching strategies
   - Handle fetch events
   - Background sync registration

### Phase 3: React Integration
5. **useWorkout Hook** (`hooks/use-workout.ts`)
   - SWR for data fetching
   - Optimistic mutations
   - Offline queue integration

6. **useOptimisticUpdate Hook** (`hooks/use-optimistic-update.ts`)
   - Generic optimistic update utilities
   - Rollback management
   - Update merging

### Phase 4: Background Sync
7. **BackgroundSyncManager** (`lib/offline/background-sync.ts`)
   - Sync event handling
   - Priority queue processing
   - Batch optimizations

### Phase 5: UI Polish
8. **Offline Indicators** (`components/offline-indicator.tsx`)
   - Connection status
   - Pending sync count
   - Sync progress

## Key Benefits

1. **Instant Navigation**: All data cached locally
2. **Works Offline**: Complete workout without connection
3. **No Data Loss**: Queue syncs when online
4. **Fast Updates**: Optimistic UI with rollback
5. **Smart Sync**: Batched, prioritized updates

## Configuration Needed

```bash
npm install --save-dev next-pwa workbox-webpack-plugin
npm install swr idb
```

## Next Steps

Run the tests to ensure they fail (TDD), then implement each component to make them pass:

```bash
npm test __tests__/offline/
```