'use client'

import { useEffect, useState, useMemo } from 'react'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Trophy, Loader2, ArrowLeft, HelpCircle, Flame } from 'lucide-react'
import Link from 'next/link'

export default function LeaderboardPage() {
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [sellersInfo, setSellersInfo] = useState<any[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: stateData } = await supabase.from('game_state').select('*').eq('id', 1).single()
      if (stateData) setGameState(stateData)

      const { data: productData } = await supabase.from('game_products').select('*').eq('status', 'on_sale')
      if (productData) setProducts(productData)

      const { data: userData } = await supabase.from('users').select('id, name')
      if (userData) setSellersInfo(userData)
      
      setLoading(false)
    }
    fetchData()
  }, [supabase])

  useEffect(() => {
    const stateSub = supabase.channel('public:game_state_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, payload => {
        setGameState(payload.new)
      }).subscribe()

    const productSub = supabase.channel('public:game_products_leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_products' }, payload => {
        if (payload.eventType === 'INSERT' && payload.new.status === 'on_sale') {
          setProducts(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          })
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === 'on_sale') {
            setProducts(prev => {
              const exists = prev.find(p => p.id === payload.new.id)
              if (exists) return prev.map(p => p.id === payload.new.id ? payload.new : p)
              return [...prev, payload.new]
            })
          }
        }
      }).subscribe()

    return () => {
      supabase.removeChannel(stateSub)
      supabase.removeChannel(productSub)
    }
  }, [supabase])

  const leaderboardData = useMemo(() => {
    const mapped = products.map(product => {
      const sellerInfo = sellersInfo.find(u => u.id === product.seller_id)
      const sales_amount = (product.sales_count || 0) * (product.price || 0)
      return {
        ...product,
        sellerName: sellerInfo?.name || 'Unknown Hero',
        sales_amount
      }
    })
    const sorted = mapped.sort((a, b) => b.sales_amount - a.sales_amount)
    
    let currentRank = 1
    let prevSales = -1
    
    return sorted.map((item, index) => {
      const sales = item.sales_amount
      if (sales !== prevSales) {
        currentRank = index + 1
        prevSales = sales
      }
      return { ...item, rank: currentRank }
    })
  }, [products, sellersInfo])

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="w-20 h-20 animate-spin text-[#000] mb-8" />
        <p className="comic-title text-4xl text-white">Gathering Heroes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-[#000] font-sans flex flex-col relative pb-20 overflow-x-hidden">
      
      <div className="relative z-10 w-full p-4 sm:p-6">
        <Link href="/town-game/profile" className="comic-btn bg-white !px-4 sm:!px-6 !py-2 sm:!py-3 inline-flex items-center gap-2 text-lg sm:text-xl">
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" /> <span>RETREAT</span>
        </Link>
      </div>

      <div className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col items-center">
        
        <div className="flex flex-col items-center mb-12 sm:mb-16 text-center relative w-full">
          {/* Background Action Burst */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full min-w-[300px] min-h-[300px] bg-[#ffeb3b] action-burst z-[-1] opacity-50"></div>
          
          <div className="w-20 h-20 sm:w-32 sm:h-32 bg-[#ff3b30] border-4 border-[#000] flex items-center justify-center mb-6 sm:mb-8 shadow-[6px_6px_0px_#000] sm:shadow-[8px_8px_0px_#000] transform -rotate-6">
            <Trophy className="w-10 h-10 sm:w-16 sm:h-16 text-white" />
          </div>
          <h1 className="comic-title text-5xl sm:text-7xl md:text-9xl mb-2 text-white px-2">
            {gameState?.results_revealed ? 'CHAMPIONS' : 'HALL OF FAME'}
          </h1>
        </div>

        <div className="w-full space-y-6 sm:space-y-8">
          {leaderboardData.length === 0 ? (
            <div className="comic-panel p-8 sm:p-16 text-center bg-white font-bangers text-2xl sm:text-3xl text-gray-500">
              No heroes are battling right now.
            </div>
          ) : !gameState?.results_revealed ? (
            // HIDDEN STATE
            <div className="comic-panel p-8 sm:p-16 bg-[#af52de] text-center transform rotate-1">
              <div className="action-burst w-32 h-32 sm:w-48 sm:h-48 bg-[#ffeb3b] border-4 border-[#000] flex items-center justify-center mx-auto mb-6 sm:mb-10">
                <HelpCircle className="w-16 h-16 sm:w-24 sm:h-24 text-[#000]" />
              </div>
              <h2 className="comic-title text-4xl sm:text-6xl text-white mb-6 sm:mb-8">RESULTS HIDDEN!</h2>
              <p className="text-xl sm:text-3xl font-bold bg-white p-4 sm:p-8 border-4 border-[#000] shadow-[6px_6px_0px_#000] inline-block transform -rotate-1">
                The Game Master is calculating the final scores! Who will win?!
              </p>
            </div>
          ) : (
            // REVEALED STATE
            leaderboardData.map((item, index) => {
              const isFirst = item.rank === 1
              const isSecond = item.rank === 2
              const isThird = item.rank === 3
              
              let cardBg = "bg-white"
              let badgeColor = "bg-gray-200"
              let transform = "rotate-0"
              
              if (isFirst) {
                cardBg = "bg-[#ffeb3b] scale-105 z-10"
                badgeColor = "bg-[#ff3b30] text-white"
                transform = "-rotate-1"
              } else if (isSecond) {
                cardBg = "bg-gray-100"
                badgeColor = "bg-[#32ade6] text-white"
                transform = "rotate-1"
              } else if (isThird) {
                cardBg = "bg-orange-100"
                badgeColor = "bg-[#34c759] text-white"
                transform = "-rotate-1"
              }

              return (
                <div 
                  key={item.id} 
                  className={`comic-panel relative flex flex-col sm:flex-row sm:items-center justify-between p-6 sm:p-10 transform ${transform} ${cardBg}`}
                >
                  <div className="flex items-center gap-4 sm:gap-8 mb-6 sm:mb-0">
                    <div className={`action-burst w-20 h-20 sm:w-24 sm:h-32 md:w-32 border-4 border-[#000] flex items-center justify-center flex-shrink-0 ${badgeColor}`}>
                      <span className="comic-title text-3xl sm:text-5xl md:text-7xl -mt-1 sm:-mt-2">#{item.rank}</span>
                    </div>
                    <div>
                      <h3 className="comic-title text-3xl sm:text-4xl md:text-5xl text-white mb-2">
                        {item.sellerName}
                        {isFirst && <Flame className="w-6 h-6 sm:w-10 sm:h-10 text-[#ff3b30] inline ml-2 sm:ml-4 animate-bounce" />}
                      </h3>
                      <p className="font-bold text-lg sm:text-2xl text-gray-800 bg-white px-3 sm:px-4 py-1 sm:py-2 border-4 border-[#000] inline-block transform rotate-1 shadow-[4px_4px_0px_#000]">
                        {item.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 sm:gap-6 mt-4 sm:mt-0 flex-shrink-0">
                    <div className="flex flex-col items-center justify-center p-3 sm:p-4 bg-white border-4 border-[#000] shadow-[4px_4px_0px_#000] transform rotate-1">
                      <span className="comic-title text-3xl sm:text-4xl md:text-5xl text-white leading-none">{item.sales_count || 0}</span>
                      <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#000] mt-1">SALES</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 sm:p-6 bg-white border-4 border-[#000] shadow-[4px_4px_0px_#000] sm:shadow-[6px_6px_0px_#000] transform -rotate-2">
                      <span className="comic-title text-5xl sm:text-6xl md:text-8xl text-white leading-none">₹{item.sales_amount || 0}</span>
                      <span className="text-sm sm:text-xl font-bold uppercase tracking-widest text-[#000] mt-1 sm:mt-2">REVENUE</span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
