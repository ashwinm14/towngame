'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2, ShieldAlert } from 'lucide-react'

export default function ProfileRedirectPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // 1. Check if user exists in game_profiles
      let { data: profile, error: profileError } = await supabase
        .from('game_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // User not in game_profiles yet, insert them via secure API
        try {
          const res = await fetch('/api/town-game/init-profile', { method: 'POST' })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error)
          profile = data.profile
        } catch (err: any) {
          console.error('Error inserting game profile:', err)
          setError('Could not initialize your game profile.')
          return
        }
      } else if (profileError) {
        console.error('Error fetching profile:', profileError)
        setError('Error loading your game profile.')
        return
      }

      // 2. Redirect based on role
      if (profile?.role === 'admin') {
        router.push('/town-game/admin')
      } else if (profile?.role === 'seller') {
        router.push('/town-game/profile/seller')
      } else {
        router.push('/town-game/profile/buyer')
      }
    }

    initProfile()
  }, [router, supabase])

  if (error) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent p-4">
        <div className="comic-panel p-8 sm:p-12 text-center max-w-md transform rotate-1">
          <div className="action-burst w-24 h-24 bg-[#ff3b30] border-4 border-[#000] flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-12 h-12 text-white" />
          </div>
          <h1 className="comic-title text-4xl sm:text-5xl text-white mb-4">ERROR!</h1>
          <p className="text-[#ff3b30] font-bold text-lg sm:text-xl mb-6 sm:mb-8 bg-gray-100 p-4 border-4 border-[#000] shadow-[4px_4px_0px_#000]">{error}</p>
          <div className="flex flex-col gap-4">
            <button onClick={() => window.location.reload()} className="comic-btn comic-btn-blue w-full !py-3 sm:!py-4 text-xl sm:text-2xl transform -rotate-1">
              <span>RETRY</span>
            </button>
            <button onClick={async () => {
              const supabase = createBrowserSupabaseClient()
              await supabase.auth.signOut()
              router.push('/login')
            }} className="comic-btn bg-white w-full !py-4 text-xl">
              <span>LOGOUT</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent">
      <Loader2 className="w-16 h-16 sm:w-20 sm:h-20 animate-spin text-[#000] mb-6 sm:mb-8" />
      <p className="comic-title text-3xl sm:text-4xl text-white">Authenticating Hero...</p>
    </div>
  )
}
