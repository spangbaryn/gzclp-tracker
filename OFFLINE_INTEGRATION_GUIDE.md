# Offline Integration Guide

## Quick Start

The offline infrastructure is now ready to use in your GZCLP tracker. Here's how to integrate it:

## 1. Workout Page Integration

Replace the current fetch calls with the offline-aware `useWorkout` hook:

```typescript
// components/workout-container.tsx
'use client'

import { useWorkout } from '@/hooks/use-workout'
import { useOfflineStatus } from '@/hooks/use-offline-status'

export function WorkoutContainer({ initialWorkoutKey, settings, progressions, user }) {
  const { workout, completeSet, error, isLoading } = useWorkout()
  const { isOnline, connectionQuality } = useOfflineStatus()
  
  // No need to poll - SWR handles updates
  // Data syncs automatically when online
  
  const handleSetComplete = async (exerciseId: string, setId: string, reps: number) => {
    // UI updates immediately, syncs in background
    await completeSet(exerciseId, setId, reps)
  }
  
  // Show connection warning for poor networks
  if (connectionQuality === 'poor' && isOnline) {
    return (
      <div className="glass rounded-lg p-4 mb-4 border border-orange-500/20">
        <p className="text-sm text-orange-400">
          Poor connection detected. Your workout will be saved offline.
        </p>
      </div>
    )
  }
  
  return <WorkoutView onSetComplete={handleSetComplete} /* ... */ />
}
```

## 2. Timer Integration

Add timer persistence to rest timer component:

```typescript
// components/rest-timer.tsx
import { TimerManager } from '@/lib/offline/timer-manager'
import { WorkoutCache } from '@/lib/offline/workout-cache'

const cache = new WorkoutCache()
const timerManager = new TimerManager(cache)

export function RestTimer({ duration, onComplete }) {
  const [timerId, setTimerId] = useState<string>()
  
  const startTimer = async () => {
    const id = await timerManager.startRestTimer({
      workoutId: currentWorkout.id,
      exerciseId: currentExercise.id,
      setId: currentSet.id,
      duration,
      onComplete
    })
    setTimerId(id)
  }
  
  // Timer persists across reload/suspension
  useEffect(() => {
    if (timerId) {
      return () => {
        // Cleanup handled automatically
      }
    }
  }, [timerId])
}
```

## 3. History Page (Already Done)

The history page already has `dynamic = 'force-dynamic'` to ensure fresh data.

## 4. API Route Updates

Update your API routes to trigger revalidation:

```typescript
// app/api/workouts/complete/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  // ... complete workout logic ...
  
  // Trigger revalidation
  revalidatePath('/history')
  revalidatePath('/progress')
  
  return Response.json({ success: true })
}
```

## 5. Service Worker Registration

The service worker is automatically registered by next-pwa. To manually control it:

```typescript
// components/service-worker-updater.tsx
'use client'

import { useEffect } from 'react'

export function ServiceWorkerUpdater() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        // Check for updates
        registration.update()
        
        // Listen for new service worker
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              if (confirm('New version available! Reload to update?')) {
                newWorker.postMessage({ type: 'skip-waiting' })
                window.location.reload()
              }
            }
          })
        })
      })
    }
  }, [])
  
  return null
}
```

## 6. Testing Offline Features

### In Development:
```bash
# Start dev server
npm run dev

# In Chrome DevTools:
# 1. Open Application tab
# 2. Go to Service Workers
# 3. Check "Offline" to simulate offline mode
# 4. Test completing sets - should work offline
# 5. Uncheck "Offline" - data should sync
```

### Testing Tips:
1. **Simulate Poor Connection**: Chrome DevTools → Network → Slow 3G
2. **Test Timer Persistence**: Start timer → Reload page → Timer continues
3. **Test Background Sync**: Go offline → Complete workout → Go online → Check sync
4. **Test on Real Device**: Deploy to Vercel and test on phone

## 7. Monitoring

Add logging to track offline usage:

```typescript
// lib/analytics.ts
export function trackOfflineUsage() {
  const { isOnline, pendingCount } = useOfflineStatus()
  
  useEffect(() => {
    if (!isOnline) {
      console.log('User working offline', { pendingCount })
      // Send to analytics when back online
    }
  }, [isOnline, pendingCount])
}
```

## Features Now Available

1. **Offline Workout Completion** ✅
   - Complete sets without internet
   - Data saved locally
   - Syncs when reconnected

2. **Timer Persistence** ✅
   - Rest timers survive reload
   - Continue where left off
   - Audio/vibration alerts

3. **Smart Sync** ✅
   - Prioritizes workout completion
   - Batches small updates
   - Retries with backoff

4. **Connection Awareness** ✅
   - Real connectivity detection
   - Poor connection warnings
   - Offline indicator

5. **Progressive Web App** ✅
   - Installable on phones
   - Works like native app
   - Offline support

## Next Steps

1. Test on real devices (especially iOS)
2. Monitor sync reliability
3. Add workout history caching
4. Consider adding exercise database offline