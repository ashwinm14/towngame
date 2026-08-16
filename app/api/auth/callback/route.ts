import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/town-game/profile'

    const error_description = searchParams.get('error_description')

    if (error_description) {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error_description)}`)
    }

    if (code) {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
      console.error('Code exchange error:', error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  } catch (err: any) {
    console.error('Callback route error:', err)
    return NextResponse.redirect(`${new URL(request.url).origin}/login?error=Internal server error`)
  }
}
