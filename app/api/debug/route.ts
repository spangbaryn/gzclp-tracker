import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function GET() {
  try {
    const user = await getOrCreateUser()
    
    const settings = await prisma.userSettings.findUnique({
      where: { userId: user.id }
    })
    
    const progressions = await prisma.progression.findMany({
      where: { userId: user.id }
    })
    
    return NextResponse.json({
      userId: user.id,
      settings,
      progressions,
      needsSetup: settings && (
        settings.squatMax === 0 || 
        settings.benchMax === 0 || 
        settings.deadliftMax === 0 || 
        settings.ohpMax === 0
      )
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}