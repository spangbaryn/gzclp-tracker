import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { POST } from '@/app/api/workouts/complete/route'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

// Mock dependencies
jest.mock('@/lib/db', () => ({
  prisma: {
    workout: {
      create: jest.fn()
    },
    progression: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    userSettings: {
      update: jest.fn()
    },
    user: {
      findUnique: jest.fn()
    }
  }
}))

jest.mock('@/lib/user', () => ({
  getOrCreateUser: jest.fn()
}))

describe('Complete Workout API', () => {
  const mockUser = {
    id: 'test-user',
    settings: {
      currentWorkout: 0
    }
  }
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getOrCreateUser as jest.Mock).mockResolvedValue(mockUser)
  })
  
  it('should advance workout from A1 (0) to B1 (1)', async () => {
    const mockRequest = {
      json: async () => ({
        workoutKey: 'A1',
        exercises: []
      })
    } as any
    
    ;(prisma.workout.create as jest.Mock).mockResolvedValue({ id: 'workout-1' })
    ;(prisma.userSettings.update as jest.Mock).mockResolvedValue({
      currentWorkout: 1
    })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      ...mockUser,
      settings: { currentWorkout: 1 }
    })
    
    const response = await POST(mockRequest)
    const data = await response.json()
    
    expect(prisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: 'test-user' },
      data: { currentWorkout: 1 }
    })
    expect(data.success).toBe(true)
  })
  
  it('should advance workout from B1 (1) to A2 (2)', async () => {
    mockUser.settings.currentWorkout = 1
    
    const mockRequest = {
      json: async () => ({
        workoutKey: 'B1',
        exercises: []
      })
    } as any
    
    ;(prisma.workout.create as jest.Mock).mockResolvedValue({ id: 'workout-2' })
    ;(prisma.userSettings.update as jest.Mock).mockResolvedValue({
      currentWorkout: 2
    })
    
    await POST(mockRequest)
    
    expect(prisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: 'test-user' },
      data: { currentWorkout: 2 }
    })
  })
  
  it('should loop from B2 (3) back to A1 (0)', async () => {
    mockUser.settings.currentWorkout = 3
    
    const mockRequest = {
      json: async () => ({
        workoutKey: 'B2',
        exercises: []
      })
    } as any
    
    ;(prisma.workout.create as jest.Mock).mockResolvedValue({ id: 'workout-4' })
    ;(prisma.userSettings.update as jest.Mock).mockResolvedValue({
      currentWorkout: 0
    })
    
    await POST(mockRequest)
    
    expect(prisma.userSettings.update).toHaveBeenCalledWith({
      where: { userId: 'test-user' },
      data: { currentWorkout: 0 }
    })
  })
  
  it('should handle progression updates correctly', async () => {
    const mockProgression = {
      id: 'prog-1',
      t1Stage: 1,
      t1Weight: 200
    }
    
    const mockRequest = {
      json: async () => ({
        workoutKey: 'A1',
        exercises: [{
          name: 'Squat',
          tier: 1,
          type: 'squat',
          weight: 200,
          stage: '5x3',
          sets: [
            { reps: 3, completed: true, isAmrap: false },
            { reps: 3, completed: true, isAmrap: false },
            { reps: 3, completed: true, isAmrap: false },
            { reps: 3, completed: true, isAmrap: false },
            { reps: 3, completed: true, isAmrap: true }
          ]
        }]
      })
    } as any
    
    ;(prisma.workout.create as jest.Mock).mockResolvedValue({ id: 'workout-1' })
    ;(prisma.progression.findUnique as jest.Mock).mockResolvedValue(mockProgression)
    ;(prisma.progression.update as jest.Mock).mockResolvedValue({})
    ;(prisma.userSettings.update as jest.Mock).mockResolvedValue({})
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
    
    await POST(mockRequest)
    
    // Should increase weight by 10 for squat (not bench/ohp which get 5)
    expect(prisma.progression.update).toHaveBeenCalledWith({
      where: { id: 'prog-1' },
      data: {
        t1Weight: 210,
        t1Stage: 1 // Stage stays the same on success
      }
    })
  })
})