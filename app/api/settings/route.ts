import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST(request: NextRequest) {
  try {
    const { unit, squatMax, benchMax, deadliftMax, ohpMax } = await request.json()
    const user = await getOrCreateUser()

    // Update settings
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        unit,
        squatMax,
        benchMax,
        deadliftMax,
        ohpMax
      }
    })

    // Initialize progression weights if not set
    const progressions = await prisma.progression.findMany({
      where: { userId: user.id }
    })

    for (const prog of progressions) {
      const maxWeights: Record<string, number> = { squatMax, benchMax, deadliftMax, ohpMax }
      const maxWeight = maxWeights[`${prog.liftType}Max`]
      
      if (!prog.t1Weight && maxWeight) {
        await prisma.progression.update({
          where: { id: prog.id },
          data: {
            t1Weight: maxWeight,
            t2Weight: Math.round(maxWeight * 0.65)
          }
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}