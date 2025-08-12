import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useRestTimer } from '@/hooks/use-rest-timer'

beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('useRestTimer Hook', () => {
  it('should initialize with no timer', () => {
    const { result } = renderHook(() => useRestTimer())
    
    expect(result.current.startTime).toBeNull()
    expect(result.current.elapsedSeconds).toBe(0)
    expect(result.current.isRunning).toBe(false)
  })

  it('should start timer when startTimer is called', () => {
    const { result } = renderHook(() => useRestTimer())
    
    act(() => {
      result.current.startTimer()
    })
    
    expect(result.current.startTime).toBeTruthy()
    expect(result.current.isRunning).toBe(true)
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it('should update elapsed seconds as time passes', () => {
    const { result } = renderHook(() => useRestTimer())
    
    act(() => {
      result.current.startTimer()
    })
    
    // Advance timer by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    
    expect(result.current.elapsedSeconds).toBe(5)
    
    // Advance by another 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    
    expect(result.current.elapsedSeconds).toBe(15)
  })

  it('should stop timer when stopTimer is called', () => {
    const { result } = renderHook(() => useRestTimer())
    
    act(() => {
      result.current.startTimer()
    })
    
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    
    expect(result.current.elapsedSeconds).toBe(5)
    
    act(() => {
      result.current.stopTimer()
    })
    
    expect(result.current.isRunning).toBe(false)
    expect(result.current.startTime).toBeNull()
    expect(result.current.elapsedSeconds).toBe(0)
  })

  it('should reset timer when resetTimer is called', () => {
    const { result } = renderHook(() => useRestTimer())
    
    act(() => {
      result.current.startTimer()
    })
    
    act(() => {
      jest.advanceTimersByTime(10000)
    })
    
    expect(result.current.elapsedSeconds).toBe(10)
    
    act(() => {
      result.current.resetTimer()
    })
    
    expect(result.current.startTime).toBeTruthy() // Still has start time
    expect(result.current.isRunning).toBe(true) // Still running
    expect(result.current.elapsedSeconds).toBe(0) // But elapsed is reset
  })

  it('should format time correctly', () => {
    const { result } = renderHook(() => useRestTimer())
    
    // Test various time formats
    expect(result.current.formatTime(0)).toBe('0:00')
    expect(result.current.formatTime(5)).toBe('0:05')
    expect(result.current.formatTime(65)).toBe('1:05')
    expect(result.current.formatTime(600)).toBe('10:00')
    expect(result.current.formatTime(3661)).toBe('61:01') // Over an hour
  })

  it('should clean up interval on unmount', () => {
    const { result, unmount } = renderHook(() => useRestTimer())
    
    act(() => {
      result.current.startTimer()
    })
    
    // Verify timer is running
    expect(result.current.isRunning).toBe(true)
    
    // Unmount should clean up
    unmount()
    
    // Advance timers to ensure no memory leaks
    act(() => {
      jest.advanceTimersByTime(5000)
    })
    
    // No errors should occur
  })
})