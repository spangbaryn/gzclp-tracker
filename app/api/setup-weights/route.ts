import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST(request: NextRequest) {
  try {
    const { squatMax, benchMax, deadliftMax, ohpMax } = await request.json()
    console.log('Received starting weights:', { squatMax, benchMax, deadliftMax, ohpMax })
    const user = await getOrCreateUser()

    // Update settings with starting weights
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        squatMax,
        benchMax,
        deadliftMax,
        ohpMax
      }
    })

    // Initialize progressions with these weights
    const progressions = await prisma.progression.findMany({
      where: { userId: user.id }
    })

    for (const prog of progressions) {
      const maxWeights: Record<string, number> = { 
        squat: squatMax, 
        bench: benchMax, 
        deadlift: deadliftMax, 
        ohp: ohpMax 
      }
      const maxWeight = maxWeights[prog.liftType]
      
      if (maxWeight) {
        console.log(`Updating progression for ${prog.liftType}: T1=${maxWeight}, T2=${Math.round(maxWeight * 0.65)}`)
        await prisma.progression.update({
          where: { id: prog.id },
          data: {
            t1Weight: maxWeight,
            t2Weight: Math.round(maxWeight * 0.65)
          }
        })
      }
    }
    
    // Verify the updates
    const updatedProgressions = await prisma.progression.findMany({
      where: { userId: user.id }
    })
    console.log('Updated progressions:', updatedProgressions)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting up weights:', error)
    return NextResponse.json({ error: 'Failed to setup weights' }, { status: 500 })
  }
}