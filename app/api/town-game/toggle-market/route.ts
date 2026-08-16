import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { open, allowance } = await request.json()
    if (open === undefined) return NextResponse.json({ error: 'Missing open state' }, { status: 400 })

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify admin
    const { data: profile } = await supabase
      .from('game_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminSupabaseClient()

    const updateData: any = { marketplace_open: open, updated_at: new Date().toISOString() }
    if (open && allowance !== undefined) {
      updateData.buyer_allowance = allowance
    }

    const { error } = await adminClient
      .from('game_state')
      .update(updateData)
      .eq('id', 1)

    if (error) throw error

    if (open && allowance !== undefined) {
      const { error: profileError } = await adminClient
        .from('game_profiles')
        .update({ balance: allowance })
        .eq('role', 'buyer')
        .eq('has_purchased', false)
      
      if (profileError) throw profileError
    }

    return NextResponse.json({ success: true, open }, { status: 200 })

  } catch (error: any) {
    console.error('Toggle market error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
