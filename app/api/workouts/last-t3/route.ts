import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET() {
  try {
    const user = await getOrCreateUser()

    // Get all accessory progressions for this user
    const accessoryProgressions = await prisma.accessoryProgression.findMany({
      where: { userId: user.id }
    })

    // Build T3 weight data - now directly from progression table
    const t3Weights: Record<string, { weight: number, shouldIncrease: boolean }> = {}

    for (const progression of accessoryProgressions) {
      t3Weights[progression.exerciseName] = {
        weight: progression.weight,
        shouldIncrease: false // No longer needed since weight is already updated in DB
      }
    }

    return NextResponse.json(t3Weights)
  } catch (error) {
    console.error('Error fetching T3 weights:', error)
    return NextResponse.json({})
  }
}