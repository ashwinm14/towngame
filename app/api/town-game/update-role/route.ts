import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { userId, role } = await request.json()

    if (!userId || !role) {
      return NextResponse.json({ error: 'Missing userId or role' }, { status: 400 })
    }

    if (!['admin', 'seller', 'buyer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify admin
    const { data: adminProfile } = await supabase
      .from('game_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adminClient = await createAdminSupabaseClient()

    // If the role is being changed to something other than 'seller', we should probably remove any product they have on sale.
    if (role !== 'seller') {
      await adminClient
        .from('game_products')
        .delete()
        .eq('seller_id', userId)
    }

    // Update the role
    const { error } = await adminClient
      .from('game_profiles')
      .update({ role })
      .eq('id', userId)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Role updated successfully' }, { status: 200 })

  } catch (error: any) {
    console.error('Update role error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
