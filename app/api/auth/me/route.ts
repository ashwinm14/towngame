import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 })
  }

  if (!user) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 })
  }

  if (!user.email_confirmed_at) {
    return NextResponse.json({ message: 'Email address not verified' }, { status: 403 })
  }

  const { data: userRecord, error: userRecordError } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single()

  if (userRecordError) {
    return NextResponse.json({ error: userRecordError.message }, { status: 500 })
  }

  return NextResponse.json({ user: userRecord, authUser: user }, { status: 200 })
}
