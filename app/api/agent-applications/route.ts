import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const agentProfileId = searchParams.get('agent_profile_id')

    console.log('🔍 API /agent-applications - agentProfileId:', agentProfileId)

    if (!agentProfileId) {
      return NextResponse.json(
        { error: 'agent_profile_id is required' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // Obtener aplicaciones donde assigned_agent_id = agentProfileId
    const { data: applications, error } = await adminClient
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        assigned_agent_id,
        company_id,
        user_id,
        email,
        phone,
        carrier_name
      `)
      .eq('assigned_agent_id', agentProfileId)
      .order('created_at', { ascending: false })

    console.log('📊 API /agent-applications - Query result:', {
      count: applications?.length || 0,
      error: error?.message,
      agentProfileId
    })

    if (error) {
      console.error('❌ Error fetching agent applications:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    // Obtener información adicional (insurance companies, users)
    const companyIds = [...new Set(applications?.map(app => app.company_id).filter(Boolean))]
    const userIds = [...new Set(applications?.map(app => app.user_id).filter(Boolean))]

    console.log('📋 Fetching related data:', {
      companyIds: companyIds.length,
      userIds: userIds.length
    })

    // Fetch insurance companies
    const { data: insuranceCompanies } = await adminClient
      .from('insurance_companies')
      .select('id, name')
      .in('id', companyIds)

    // Fetch users
    const { data: users } = await adminClient
      .from('users')
      .select('id, first_name, last_name, email')
      .in('id', userIds)

    // Map data to applications
    const applicationsWithDetails = applications?.map(app => ({
      ...app,
      insurance_companies: insuranceCompanies?.find(ic => ic.id === app.company_id) || null,
      users: users?.find(u => u.id === app.user_id) || null,
    }))

    console.log('✅ API /agent-applications - Returning:', applicationsWithDetails?.length || 0, 'applications')

    return NextResponse.json({
      data: applicationsWithDetails || [],
      count: applicationsWithDetails?.length || 0
    })

  } catch (error: any) {
    console.error('❌ Error in /api/agent-applications:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

