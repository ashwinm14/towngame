import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminClient = await createAdminSupabaseClient()

    // 1. Safely upsert the profile. ignoreDuplicates prevents overwriting an existing role (like admin)
    // and also prevents duplicate key race conditions if called twice concurrently.
    const { error: upsertError } = await adminClient
      .from('game_profiles')
      .upsert({ id: session.user.id, role: 'buyer' }, { onConflict: 'id', ignoreDuplicates: true })

    if (upsertError) {
      throw upsertError
    }

    // 2. Fetch the profile to return it (guaranteed to exist now)
    const { data: profile, error: selectError } = await adminClient
      .from('game_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (selectError) {
      throw selectError
    }

    return NextResponse.json({ profile }, { status: 200 })

  } catch (error: any) {
    console.error('Init profile error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
