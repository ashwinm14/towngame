import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { sellerId, name } = await request.json()
    if (!sellerId || !name) return NextResponse.json({ error: 'Missing sellerId or name' }, { status: 400 })

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

    // Upsert product (since seller_id is unique)
    const { data, error } = await adminClient
      .from('game_products')
      .upsert(
        { seller_id: sellerId, name, status: 'assigned' }, 
        { onConflict: 'seller_id' }
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, product: data }, { status: 200 })

  } catch (error: any) {
    console.error('Assign product error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
