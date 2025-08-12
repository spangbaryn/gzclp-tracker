import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// Polyfill TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Mock fetch for Prisma Accelerate
global.fetch = jest.fn()

// Mock Next.js server components globally
global.Request = jest.fn()
global.Response = jest.fn()

jest.mock('next/server', () => ({
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method || 'GET',
    headers: new Map(),
    json: jest.fn(() => Promise.resolve(init?.body ? JSON.parse(init.body) : {}))
  })),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: jest.fn(() => Promise.resolve(data)),
      status: init?.status || 200,
      headers: new Map()
    }))
  }
}))