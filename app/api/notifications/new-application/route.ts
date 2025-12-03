import { NextRequest, NextResponse } from 'next/server'
import { createNewApplicationNotification } from '@/lib/utils/notifications'

// Headers CORS para permitir llamadas desde otros dominios
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Manejar preflight CORS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    const { applicationId, clientId } = await request.json()

    if (!applicationId || !clientId) {
      return NextResponse.json(
        { error: 'applicationId and clientId are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await createNewApplicationNotification(applicationId, clientId)

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error creating new application notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500, headers: corsHeaders }
    )
  }
}
