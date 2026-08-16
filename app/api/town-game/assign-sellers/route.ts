import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { count } = await request.json()
    const numToAssign = Number(count) || 1

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const { data: profile } = await supabase
      .from('game_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const adminClient = await createAdminSupabaseClient()

    // 1. Fetch all current buyers
    const { data: buyers, error: buyersError } = await adminClient
      .from('game_profiles')
      .select('id')
      .eq('role', 'buyer')

    if (buyersError) {
      throw buyersError
    }

    if (!buyers || buyers.length === 0) {
      return NextResponse.json({ error: 'No buyers available to assign as sellers.' }, { status: 400 })
    }

    // 2. Randomly select N buyers using Fisher-Yates shuffle
    const shuffled = [...buyers]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const selected = shuffled.slice(0, Math.min(numToAssign, buyers.length))
    const selectedIds = selected.map(b => b.id)

    // 3. Update their roles to seller
    const { error: updateError } = await adminClient
      .from('game_profiles')
      .update({ role: 'seller', updated_at: new Date().toISOString() })
      .in('id', selectedIds)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({ success: true, sellersCount: selectedIds.length }, { status: 200 })

  } catch (error: any) {
    console.error('Assign sellers error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
