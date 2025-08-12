import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getOrCreateUser } from '@/lib/user'

export async function POST(request: NextRequest) {
  try {
    const { unit } = await request.json()
    const user = await getOrCreateUser()

    // Update settings
    await prisma.userSettings.update({
      where: { userId: user.id },
      data: {
        unit
      }
    })


    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}