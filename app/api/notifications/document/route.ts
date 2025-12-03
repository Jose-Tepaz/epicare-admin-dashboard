import { NextRequest, NextResponse } from 'next/server'
import { createDocumentUploadNotification } from '@/lib/utils/notifications'

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
    const { documentId, clientId, documentName } = await request.json()

    if (!documentId || !clientId) {
      return NextResponse.json(
        { error: 'documentId and clientId are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    await createDocumentUploadNotification(documentId, clientId, documentName)

    return NextResponse.json({ success: true }, { headers: corsHeaders })
  } catch (error) {
    console.error('Error creating document notification:', error)
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500, headers: corsHeaders }
    )
  }
}
