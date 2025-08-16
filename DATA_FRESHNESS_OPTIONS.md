# Data Freshness Options for GZCLP PWA

## Current Setup
- **PWA Manifest**: Basic PWA configuration without service worker
- **HTTP Headers**: Aggressive no-cache headers on all routes
- **Next.js**: Default caching behavior (static by default in App Router)

## Options for Fresh Data

### 1. Page-Level Caching Control

#### Option A: Force Dynamic Rendering (Currently implemented for history page)
```typescript
export const dynamic = 'force-dynamic'
```
- **Pros**: Guarantees fresh data on every request
- **Cons**: No caching benefits, slower page loads

#### Option B: Time-based Revalidation
```typescript
export const revalidate = 60 // seconds
```
- **Pros**: Balance between performance and freshness
- **Cons**: Data can be stale for up to the revalidation period

#### Option C: On-Demand Revalidation
```typescript
// In API routes or server actions
import { revalidatePath, revalidateTag } from 'next/cache'

// After data mutation
revalidatePath('/history')
revalidateTag('workouts')
```
- **Pros**: Fresh data immediately after mutations
- **Cons**: Requires careful implementation in all mutation points

### 2. Client-Side Data Fetching

#### Option A: Convert to Client Components with SWR/React Query
```typescript
'use client'
import useSWR from 'swr'

function HistoryPage() {
  const { data, error, mutate } = useSWR('/api/workouts', fetcher, {
    revalidateOnFocus: true,
    revalidateOnMount: true
  })
}
```
- **Pros**: Fine-grained control, automatic revalidation, offline support
- **Cons**: Initial load is slower, requires API routes

#### Option B: Router Refresh
```typescript
import { useRouter } from 'next/navigation'

const router = useRouter()
// After mutation
router.refresh()
```
- **Pros**: Simple implementation, works with server components
- **Cons**: Refreshes entire route tree

### 3. Service Worker Strategies (Not Currently Implemented)

#### Option A: Network First
```javascript
// Always try network, fall back to cache
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
  }
})
```

#### Option B: Cache then Network
```javascript
// Show cached data immediately, update in background
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        cache.put(event.request, networkResponse.clone())
        return networkResponse
      })
      return cachedResponse || fetchPromise
    })
  )
})
```

### 4. Real-Time Updates

#### Option A: WebSockets
```typescript
// Using Socket.io or native WebSockets
import { io } from 'socket.io-client'

const socket = io()
socket.on('workout-completed', (data) => {
  // Update UI immediately
})
```
- **Pros**: Instant updates, bi-directional communication
- **Cons**: Requires WebSocket server, connection management, battery drain

#### Option B: Server-Sent Events (SSE)
```typescript
const eventSource = new EventSource('/api/workout-updates')
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // Update UI
}
```
- **Pros**: Simpler than WebSockets, automatic reconnection
- **Cons**: One-way communication, requires server support

#### Option C: Long Polling
```typescript
async function pollForUpdates() {
  const response = await fetch('/api/updates?since=' + lastUpdate)
  if (response.ok) {
    const updates = await response.json()
    applyUpdates(updates)
  }
  setTimeout(pollForUpdates, 5000)
}
```
- **Pros**: Works everywhere, simple implementation
- **Cons**: Higher latency, more server load

### 5. Hybrid Approach (Recommended)

1. **Critical Data (Workouts, Progress)**:
   - Use `dynamic = 'force-dynamic'` or short `revalidate` periods
   - Implement `revalidatePath` after mutations

2. **Static Content**:
   - Allow default caching for performance

3. **User Settings**:
   - Client-side state management with API sync

## Implementation Priority

1. **Immediate**: Add `dynamic = 'force-dynamic'` to all data-dependent pages
2. **Short-term**: Implement `revalidatePath` in mutation endpoints
3. **Medium-term**: Consider SWR for frequently updated data
4. **Long-term**: Implement service worker for offline support
5. **Optional**: Add WebSockets/SSE for multi-device sync or live collaboration

## Current Issues & Solutions

### Issue: B2 workout not showing in history
**Root Cause**: Next.js static page caching
**Solution Applied**: Added `export const dynamic = 'force-dynamic'` to history page

### Recommended Next Steps:
1. Apply same fix to other data-dependent pages (progress, main workout page)
2. Add revalidation calls after workout completion
3. Consider implementing a global data refresh strategy