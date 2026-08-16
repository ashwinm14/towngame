import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const { reveal } = await request.json()
    if (reveal === undefined) return NextResponse.json({ error: 'Missing reveal state' }, { status: 400 })

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

    const { error } = await adminClient
      .from('game_state')
      .update({ results_revealed: reveal, updated_at: new Date().toISOString() })
      .eq('id', 1)

    if (error) throw error

    return NextResponse.json({ success: true, reveal }, { status: 200 })

  } catch (error: any) {
    console.error('Reveal results error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
