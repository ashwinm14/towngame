import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST() {
  try {
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

    // 1. Reset Game State
    await adminClient
      .from('game_state')
      .update({ marketplace_open: false, results_revealed: false, buyer_allowance: 0, updated_at: new Date().toISOString() })
      .eq('id', 1)

    // 2. Delete all Game Products
    // Using a filter that matches everything (e.g. status in ('draft', 'on_sale'))
    await adminClient
      .from('game_products')
      .delete()
      .in('status', ['draft', 'on_sale'])

    // 3. Delete all Profiles (except Admin)
    // This forces players to go through the init-profile flow again when they rejoin
    await adminClient
      .from('game_profiles')
      .delete()
      .neq('role', 'admin')

    return NextResponse.json({ success: true, message: 'Game has been completely reset.' }, { status: 200 })

  } catch (error: any) {
    console.error('Reset game error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
