'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Gamepad2, Zap, Shield, Trophy, Play, Rocket } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserSupabaseClient()
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })
  }, [])

  return (
    <div ref={containerRef} className="relative min-h-screen bg-transparent overflow-hidden font-sans text-[#000]">

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-20">
        
        {/* Hero */}
        <div className="text-center max-w-4xl relative">
          
          {/* Action Burst Behind Title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] min-w-[300px] min-h-[300px] bg-[#ffeb3b] action-burst z-[-1] animate-spin-slow"></div>

          <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-2 bg-[#ff3b30] border-4 border-[#000] shadow-[4px_4px_0px_#000] mb-8 transform -rotate-3">
            <img src="/tvc_w.png" alt="Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
            <span className="font-bangers text-xl sm:text-2xl tracking-[0.1em] text-white">SELL A THING</span>
          </div>

          {/* Title */}
          <h1 className="comic-title text-6xl sm:text-8xl md:text-9xl mb-8 transform rotate-2 text-[#32ade6]" style={{ WebkitTextStroke: '4px #000', textShadow: '8px 8px 0px #000' }}>
            ENTER THE<br/>
            <span className="text-[#34c759]">ARENA!</span>
          </h1>

          {/* Subtitle */}
          <div className="bg-white border-4 border-[#000] p-4 sm:p-6 shadow-[6px_6px_0px_#000] transform -rotate-1 max-w-2xl mx-auto mb-12">
            <p className="text-lg sm:text-2xl font-bold text-[#000] leading-relaxed">
              Pitch your products! Buy from the best! Dominate the leaderboard and prove you are the ultimate salesperson!
            </p>
          </div>

          {/* CTA */}
          <div className="flex flex-wrap justify-center gap-6">
            {!loading && (
              session ? (
                <>
                  <Link href="/town-game/profile" className="comic-btn comic-btn-blue !py-3 sm:!py-4 !px-6 sm:!px-8 text-xl sm:!text-3xl animate-attract hover:animate-none hover:scale-110 flex items-center justify-center gap-3">
                    <Rocket className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                    <span>TO THE DASHBOARD!</span>
                  </Link>
                  <button onClick={async () => {
                    const supabase = createBrowserSupabaseClient()
                    await supabase.auth.signOut()
                    window.location.reload()
                  }} className="comic-btn bg-white !py-3 sm:!py-4 !px-6 sm:!px-8 text-xl sm:!text-3xl transform rotate-2 hover:-translate-y-2">
                    <span>LOGOUT</span>
                  </button>
                </>
              ) : (
                <Link href="/login" className="comic-btn comic-btn-red !py-4 sm:!py-6 !px-8 sm:!px-12 text-2xl sm:!text-4xl animate-attract hover:animate-none hover:scale-110 flex items-center justify-center gap-3">
                  <Play className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
                  <span>ENTER GAME!</span>
                </Link>
              )
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
