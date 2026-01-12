import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    
    // Fetch companies
    const { data: companies, error } = await adminClient
      .from('insurance_companies')
      .select('id, name, logo_url')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Error fetching insurance companies:', error)
      return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 })
    }

    return NextResponse.json({ data: companies })
  } catch (error) {
    console.error('Error in GET /api/insurance-companies:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
