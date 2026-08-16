'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2, Package, Tag, Lock, LogOut, CheckCircle2, TrendingUp, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'

export default function SellerDashboard() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [gameState, setGameState] = useState<any>(null)
  const [product, setProduct] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  
  const [price, setPrice] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const prevReveal = useRef<boolean | null>(null)

  useEffect(() => {
    if (gameState) {
      if (prevReveal.current === false && gameState.results_revealed === true) {
        toast.success('🌟 THE RESULTS ARE IN! TO THE LEADERBOARD!')
        router.push('/town-game/leaderboard')
      }
      prevReveal.current = gameState.results_revealed
    }
  }, [gameState?.results_revealed, router])

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
      fetchData(session.user.id)
    }
    init()
  }, [router, supabase])

  useEffect(() => {
    if (profile && profile.role !== 'seller') {
      router.push('/town-game/profile')
    }
  }, [profile, router])

  const fetchData = async (id: string) => {
    setLoading(true)
    const { data: stateData } = await supabase.from('game_state').select('*').eq('id', 1).single()
    if (stateData) setGameState(stateData)

    const { data: profileData } = await supabase.from('game_profiles').select('role').eq('id', id).single()
    if (profileData?.role !== 'seller') {
      router.push('/town-game/profile')
      return
    }
    setProfile(profileData)

    const { data: productData } = await supabase.from('game_products').select('*').eq('seller_id', id).single()
    if (productData) {
      setProduct(productData)
      setPrice(productData.price ? String(productData.price) : '')
    }
    
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return

    const stateSub = supabase.channel('public:game_state_seller')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, payload => {
        setGameState(payload.new)
      }).subscribe()

    const productSub = supabase.channel(`public:game_products:seller_id=eq.${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_products', filter: `seller_id=eq.${userId}` }, payload => {
        setProduct(payload.new)
      }).subscribe()

    const profileSub = supabase.channel(`public:game_profiles:id=eq.${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_profiles', filter: `id=eq.${userId}` }, payload => {
        if (payload.eventType === 'DELETE') {
          router.push('/town-game/profile')
        } else if (payload.eventType === 'UPDATE') {
          setProfile(payload.new)
        }
      }).subscribe()

    return () => {
      supabase.removeChannel(stateSub)
      supabase.removeChannel(productSub)
      supabase.removeChannel(profileSub)
    }
  }, [userId, supabase])

  const handlePutOnSale = async () => {
    if (!price || isNaN(Number(price))) {
      toast.error('GASP! You need to set a valid price!')
      return
    }

    setIsUpdating(true)
    try {
      const res = await fetch('/api/town-game/put-on-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: product.id, price: Number(price) })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('BAM! Your product is live!')
      setProduct((prev: any) => ({ ...prev, price: Number(price), status: 'on_sale' }))
    } catch (err: any) {
      toast.error('Failed: ' + err.message)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="w-16 h-16 animate-spin text-[#000] mb-6" />
        <p className="comic-title text-4xl text-white">Suiting Up...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-[#000] font-sans flex flex-col pb-20">
      
      {/* Topbar */}
      <div className="sticky top-0 z-50 border-b-4 border-[#000] bg-white shadow-[0_4px_0px_#000]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#af52de] border-4 border-[#000] flex items-center justify-center shadow-[4px_4px_0px_#000] transform rotate-3">
              <Package className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="comic-title text-2xl sm:text-3xl text-center">SELLER LAIR</span>
          </div>
          <button onClick={handleLogout} className="comic-btn bg-white hover:bg-gray-100 flex items-center gap-2 text-sm sm:text-lg !px-3 !py-2 sm:!px-4 sm:!py-2">
            <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span>ESCAPE</span>
          </button>
        </div>
      </div>

      <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-12">
        
        {!product ? (
          <div className="comic-panel p-6 sm:p-12 text-center max-w-2xl mx-auto bg-white mt-8 sm:mt-12 transform -rotate-1">
            <div className="action-burst w-24 h-24 sm:w-32 sm:h-32 bg-[#ffeb3b] border-4 border-[#000] flex items-center justify-center mx-auto mb-6 sm:mb-8 animate-pulse">
              <Lock className="w-10 h-10 sm:w-14 sm:h-14 text-[#000]" />
            </div>
            <h1 className="comic-title text-3xl sm:text-5xl text-white mb-4 sm:mb-6">STANDBY, HERO!</h1>
            <p className="text-lg sm:text-2xl font-bold mb-6 sm:mb-8">
              The Admin is assigning your secret weapon.
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3 font-bangers text-xl sm:text-2xl text-[#af52de] tracking-widest">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> WAITING FOR ORDERS...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            
            {/* Sales Dashboard */}
            <div className="comic-panel p-6 sm:p-8 bg-[#ffeb3b] flex flex-col items-center justify-center text-center relative overflow-hidden transform rotate-1">
              <h2 className="font-bangers text-2xl sm:text-3xl tracking-widest mb-4">YOUR MISSION:</h2>
              <p className="comic-title text-4xl sm:text-5xl mb-8 sm:mb-12 text-white">{product.name}</p>
              
              <div className="w-full bg-white border-4 border-[#000] rounded-3xl p-6 sm:p-8 shadow-[8px_8px_0px_#000] relative z-10">
                {!gameState?.results_revealed ? (
                  <div className="flex flex-col items-center relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 border-4 sm:border-8 border-red-500 text-red-500 font-bangers text-4xl sm:text-6xl tracking-widest p-2 sm:p-4 opacity-80 z-20 pointer-events-none">
                      TOP SECRET
                    </div>
                    <HelpCircle className="w-16 h-16 sm:w-24 sm:h-24 text-[#af52de] mb-6 z-10" />
                    <p className="comic-title text-4xl sm:text-5xl text-white z-10">???</p>
                    <p className="text-lg sm:text-xl mt-6 text-[#000] font-bold bg-gray-100 p-4 border-4 border-[#000] shadow-[4px_4px_0px_#000] z-10 transform rotate-1">
                      Keep pitching! Sales are hidden until the grand finale!
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="action-burst w-32 h-32 sm:w-40 sm:h-40 bg-[#34c759] border-4 border-[#000] absolute -top-8 -right-8 sm:-top-10 sm:-right-10 z-0 opacity-20 animate-spin-slow"></div>
                    <TrendingUp className="w-16 h-16 sm:w-24 sm:h-24 text-[#34c759] mb-4 z-10" />
                    <p className="comic-title text-6xl sm:text-8xl text-white z-10">{product.sales_count || 0}</p>
                    <p className="font-bangers text-[#34c759] tracking-widest text-2xl sm:text-3xl mt-4 z-10" style={{ WebkitTextStroke: '1px #000' }}>TOTAL SALES!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Setup */}
            <div className="flex flex-col h-full mt-4 lg:mt-0">
              <h2 className="comic-title text-3xl sm:text-4xl mb-6 sm:mb-8 transform -rotate-2">THE PRICE</h2>
              
              <div className="speech-bubble p-6 sm:p-8 flex-1 flex flex-col mb-12">
                <label className="text-lg sm:text-xl font-bangers tracking-widest mb-4 block">SET YOUR SELLING PRICE (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className="comic-input text-2xl sm:text-4xl p-4 sm:p-6 mb-6 sm:mb-8 text-center"
                  placeholder="₹ 0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  disabled={product.status === 'on_sale'}
                />
                
                {product.status === 'on_sale' ? (
                  <div className="bg-[#34c759] border-4 border-[#000] p-4 flex items-center justify-center gap-3 sm:gap-4 shadow-[6px_6px_0px_#000] transform rotate-1">
                    <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    <span className="comic-title text-2xl sm:text-3xl text-white">LIVE ON MARKET!</span>
                  </div>
                ) : (
                  <button
                    onClick={handlePutOnSale}
                    disabled={isUpdating || !price}
                    className="comic-btn comic-btn-red w-full !py-4 sm:!py-6 text-xl sm:!text-3xl transform rotate-1"
                  >
                    {isUpdating ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto" /> : <span><Tag className="w-6 h-6 sm:w-8 sm:h-8 inline mr-2" /> PUT ON SALE!</span>}
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
