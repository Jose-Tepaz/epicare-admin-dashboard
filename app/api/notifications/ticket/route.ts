import { NextRequest, NextResponse } from 'next/server'
import { createTicketNotification } from '@/lib/utils/notifications'

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
    const { ticketId, clientId, type, ticketNumber } = await request.json()

    console.log('[API Notification] Received ticket notification request:', {
      ticketId,
      clientId,
      type,
      ticketNumber,
    })

    if (!ticketId || !clientId || !type) {
      console.log('[API Notification] Missing required fields')
      return NextResponse.json(
        { error: 'ticketId, clientId, and type are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (type !== 'new' && type !== 'reply') {
      console.log('[API Notification] Invalid type:', type)
      return NextResponse.json(
        { error: 'type must be "new" or "reply"' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log('[API Notification] Creating ticket notification...')
    await createTicketNotification(ticketId, clientId, type, ticketNumber)
    console.log('[API Notification] Ticket notification created successfully')

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error creating ticket notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500, headers: corsHeaders }
    )
  }
}

