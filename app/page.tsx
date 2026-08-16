'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Gamepad2, Swords, Lock, UserCircle, LogOut, Play } from 'lucide-react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export default function GamePortal() {
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
    <div className="relative min-h-[100dvh] bg-transparent overflow-hidden font-sans text-[#000] pb-20">

      {/* Topbar */}
      <div className="sticky top-0 z-50 border-b-4 border-[#000] bg-white shadow-[0_4px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ff3b30] border-4 border-[#000] flex items-center justify-center shadow-[4px_4px_0px_#000] transform -rotate-2 overflow-hidden p-1">
              <img src="/tvc_w.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="comic-title text-2xl sm:text-3xl text-center">TOWN GAMES PORTAL</span>
          </div>
          
          <div className="flex items-center gap-4">
            {!loading && session ? (
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-[#32ade6] text-white font-bangers text-xl px-4 py-2 border-4 border-[#000] shadow-[2px_2px_0px_#000] transform rotate-1 hidden sm:block">
                  PLAYER 1 READY!
                </div>
                <button onClick={async () => {
                    const supabase = createBrowserSupabaseClient()
                    await supabase.auth.signOut()
                    window.location.reload()
                  }} 
                  className="comic-btn bg-white hover:bg-gray-100 flex items-center gap-2 text-sm sm:text-lg !px-3 !py-2"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span>LOGOUT</span>
                </button>
              </div>
            ) : (
              !loading && (
                <Link href="/login" className="comic-btn comic-btn-blue text-sm sm:text-lg !px-4 !py-2 transform -rotate-1">
                  <span>LOGIN</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-16 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full min-w-[300px] min-h-[300px] bg-[#ffeb3b] action-burst z-[-1] opacity-50"></div>
          
          <h1 className="comic-title text-6xl sm:text-8xl md:text-9xl mb-4 text-[#af52de] transform -rotate-2" style={{ WebkitTextStroke: '3px #000', textShadow: '6px 6px 0px #000' }}>
            CHOOSE YOUR<br/>
            <span className="text-[#ff3b30]">GAME!</span>
          </h1>
          <div className="bg-white border-4 border-[#000] inline-block p-4 shadow-[6px_6px_0px_#000] transform rotate-1">
            <p className="text-xl sm:text-2xl font-bold font-bangers tracking-widest text-gray-800">
              WELCOME TO THE MULTIVERSE OF MADNESS!
            </p>
          </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12 w-full max-w-6xl">
          
          {/* Game 1: Town Games */}
          <Link href="/town-game" className="block group">
            <div className="comic-panel h-full p-6 sm:p-8 bg-[#34c759] transform transition-transform group-hover:scale-105 group-hover:-rotate-2 flex flex-col relative overflow-hidden">
              <div className="absolute top-4 right-4 bg-white font-bangers text-xl px-3 py-1 border-4 border-[#000] shadow-[2px_2px_0px_#000] transform rotate-6">
                LIVE
              </div>
              <div className="action-burst w-20 h-20 bg-white border-4 border-[#000] flex items-center justify-center mb-6 shadow-[4px_4px_0px_#000]">
                <Swords className="w-10 h-10 text-[#34c759]" />
              </div>
              <h2 className="comic-title text-4xl sm:text-5xl text-white mb-4">SELL A THING</h2>
              <p className="font-bold text-lg bg-white p-3 border-4 border-[#000] mb-6 flex-1 shadow-[4px_4px_0px_#000]">
                Pitch products, buy from friends, and dominate the sales leaderboard in this chaotic marketplace simulator!
              </p>
              <div className="comic-btn comic-btn-red text-center !py-4 w-full text-2xl mt-auto animate-attract flex items-center justify-center gap-2 hover:animate-none hover:scale-110 hover:-translate-y-1">
                <Play className="w-6 h-6 fill-current" />
                <span>PLAY NOW!</span>
              </div>
            </div>
          </Link>

          {/* Game 2: Unavailable */}
          <div className="comic-panel p-6 sm:p-8 bg-gray-200 transform flex flex-col relative border-gray-400 border-dashed border-4 shadow-none opacity-60 grayscale scale-95 pointer-events-none">
            <div className="action-burst w-16 h-16 bg-gray-300 border-4 border-gray-500 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="comic-title text-3xl sm:text-4xl text-gray-700 mb-4">MYSTERY ARENA</h2>
            <p className="font-bold text-base bg-gray-100 p-3 border-4 border-gray-400 mb-6 flex-1 text-gray-500">
              Currently under construction. Check back later for new challenges!
            </p>
            <div className="comic-btn bg-gray-400 text-gray-600 text-center !py-3 w-full text-xl mt-auto border-gray-500 shadow-none transform-none">
              <span>UNAVAILABLE</span>
            </div>
          </div>

          {/* Game 3: Unavailable */}
          <div className="comic-panel p-6 sm:p-8 bg-gray-200 transform flex flex-col relative border-gray-400 border-dashed border-4 shadow-none opacity-60 grayscale scale-95 pointer-events-none">
            <div className="action-burst w-16 h-16 bg-gray-300 border-4 border-gray-500 flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="comic-title text-3xl sm:text-4xl text-gray-700 mb-4">CODE BREAKER</h2>
            <p className="font-bold text-base bg-gray-100 p-3 border-4 border-gray-400 mb-6 flex-1 text-gray-500">
              The servers are offline. More information will be revealed soon.
            </p>
            <div className="comic-btn bg-gray-400 text-gray-600 text-center !py-3 w-full text-xl mt-auto border-gray-500 shadow-none transform-none">
              <span>UNAVAILABLE</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="mt-16 sm:mt-24 text-center bg-white border-4 border-[#000] px-4 sm:px-8 py-4 shadow-[4px_4px_0px_#000] transform -rotate-1 w-full max-w-sm sm:max-w-none">
          <p className="text-sm sm:text-xl font-bangers tracking-widest text-[#000] break-words">
            A PRODUCT OF <span className="text-[#32ade6]">IEDC CEV</span> • TOWN GAMES ECOSYSTEM
          </p>
        </div>

      </div>
    </div>
  )
}
