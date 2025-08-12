import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST(request: NextRequest) {
  try {
    const { squatMax, benchMax, deadliftMax, ohpMax } = await request.json()
    console.log('Received starting weights:', { squatMax, benchMax, deadliftMax, ohpMax })
    const user = await getOrCreateUser()
    console.log('User settings before setup:', user.settings)

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
        // T1 uses the entered weight (which is already 85% of 5RM)
        // T2 uses 65% of the T1 weight
        const t1Weight = maxWeight
        const t2Weight = Math.round(maxWeight * 0.65)
        console.log(`Updating progression for ${prog.liftType}: T1=${t1Weight}, T2=${t2Weight}`)
        await prisma.progression.update({
          where: { id: prog.id },
          data: {
            t1Weight: t1Weight,
            t2Weight: t2Weight
          }
        })
      }
    }
    
    // Verify the updates
    const updatedProgressions = await prisma.progression.findMany({
      where: { userId: user.id }
    })
    console.log('Updated progressions:', updatedProgressions)
    
    // Verify settings weren't changed
    const finalUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { settings: true }
    })
    console.log('User settings after setup:', finalUser?.settings)
    console.log('Current workout should still be:', finalUser?.settings?.currentWorkout)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error setting up weights:', error)
    return NextResponse.json({ error: 'Failed to setup weights' }, { status: 500 })
  }
}