'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2, ShoppingCart, Lock, CheckCircle2, UserCircle, LogOut, Tag } from 'lucide-react'
import { toast } from 'sonner'

export default function BuyerDashboard() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  
  const [gameState, setGameState] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [sellersInfo, setSellersInfo] = useState<any[]>([])
  
  const [isBuying, setIsBuying] = useState<string | null>(null)
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
    if (profile && profile.role !== 'buyer' && profile.role !== 'admin') {
      router.push('/town-game/profile')
    }
  }, [profile, router])

  const fetchData = async (id: string) => {
    setLoading(true)
    const { data: stateData } = await supabase.from('game_state').select('*').eq('id', 1).single()
    if (stateData) setGameState(stateData)

    const { data: profileData } = await supabase.from('game_profiles').select('*').eq('id', id).single()
    if (profileData) {
      if (profileData.role !== 'buyer' && profileData.role !== 'admin') {
        router.push('/town-game/profile')
        return
      }
      setProfile(profileData)
    }

    const { data: productData } = await supabase.from('game_products').select('*').eq('status', 'on_sale')
    if (productData) setProducts(productData)

    const { data: userData } = await supabase.from('users').select('id, name, email')
    if (userData) setSellersInfo(userData)
    
    setLoading(false)
  }

  useEffect(() => {
    if (!userId) return

    const stateSub = supabase.channel('public:game_state_buyer')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, payload => {
        setGameState(payload.new)
      }).subscribe()

    const productSub = supabase.channel('public:game_products_buyer')
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

  const mergedProducts = useMemo(() => {
    return products.map(product => {
      const sellerInfo = sellersInfo.find(u => u.id === product.seller_id || u.email === product.seller_id)
      return {
        ...product,
        sellerName: sellerInfo?.name || 'Unknown Hero'
      }
    })
  }, [products, sellersInfo])

  const handleBuy = async (productId: string) => {
    if (profile?.role === 'admin') {
      toast.error('Admins are in spectator mode and cannot buy products.')
      return
    }
    setIsBuying(productId)
    try {
      const response = await fetch('/api/town-game/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })
      const data = await response.json()
      
      if (!response.ok) throw new Error(data.error)
      
      toast.success('KACHOW! Purchase successful!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsBuying(null)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="w-20 h-20 animate-spin text-[#000] mb-6" />
        <p className="comic-title text-4xl text-white">Loading Store...</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-transparent text-[#000] font-sans flex flex-col pb-20">
      
      {/* Topbar */}
      <div className="sticky top-0 z-50 border-b-4 border-[#000] bg-white shadow-[0_4px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#32ade6] border-4 border-[#000] flex items-center justify-center shadow-[4px_4px_0px_#000] transform -rotate-3">
              <ShoppingCart className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
            </div>
            <span className="comic-title text-2xl sm:text-3xl text-center">MARKETPLACE</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
            {profile && (
              <div className="bg-[#34c759] border-4 border-[#000] px-3 py-1 sm:px-4 sm:py-2 font-bangers text-lg sm:text-2xl text-white shadow-[4px_4px_0px_#000] transform rotate-1">
                WALLET: ₹{profile.balance || 0}
              </div>
            )}
            <button onClick={handleLogout} className="comic-btn bg-white hover:bg-gray-100 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-lg !px-3 !py-1 sm:!px-4 sm:!py-2 transform -rotate-1">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span>ESCAPE</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {!gameState?.marketplace_open ? (
          // MARKETPLACE CLOSED
          <div className="comic-panel p-6 sm:p-16 text-center max-w-2xl mx-auto bg-white mt-12 transform -rotate-1">
            <div className="action-burst w-24 h-24 sm:w-40 sm:h-40 bg-[#ffeb3b] border-4 border-[#000] flex items-center justify-center mx-auto mb-8 sm:mb-10">
              <Lock className="w-12 h-12 sm:w-20 sm:h-20 text-[#000]" />
            </div>
            <h1 className="comic-title text-3xl sm:text-5xl md:text-7xl text-white mb-6">MARKET IS CLOSED!</h1>
            <p className="text-lg sm:text-2xl font-bold bg-gray-100 p-4 sm:p-6 border-4 border-[#000] shadow-[4px_4px_0px_#000] inline-block transform rotate-1 mb-8">
              The Admin hasn't started the sales yet, or the round is over! Watch the live presentations or check the results!
            </p>
            <div className="flex flex-col gap-4 sm:gap-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3 font-bangers text-2xl sm:text-3xl text-[#ff3b30] tracking-widest">
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin" /> WAITING FOR SIGNAL...
              </div>
              {(profile?.has_purchased || gameState?.results_revealed) && (
                <button onClick={() => router.push('/town-game/leaderboard')} className="comic-btn comic-btn-blue w-full justify-center !py-4 sm:!py-6 text-xl sm:text-3xl">
                  <span>VIEW LEADERBOARD!</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          // MARKETPLACE OPEN
          <>
            <div className="text-center mb-12 sm:mb-16 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-full bg-[#ffeb3b] action-burst z-[-1] opacity-50"></div>
              <h1 className="comic-title text-4xl sm:text-6xl md:text-8xl mb-4 sm:mb-6 text-white transform -rotate-2 px-2">
                CHOOSE WISELY!
              </h1>
              <p className="text-lg sm:text-2xl font-bold bg-white p-4 sm:p-6 border-4 border-[#000] shadow-[6px_6px_0px_#000] inline-block max-w-2xl mx-auto transform rotate-1">
                You can buy as many items as you want until you run out of funds! Whose pitch convinced you the most?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-12">
              {mergedProducts.length === 0 ? (
                <div className="col-span-full comic-panel p-8 sm:p-16 text-center bg-white font-bangers text-2xl sm:text-4xl text-gray-500">
                  NO ITEMS FOR SALE YET!
                </div>
              ) : (
                mergedProducts.map((product, i) => (
                  <div key={product.id} className={`comic-panel bg-white flex flex-col overflow-hidden transform ${i % 2 === 0 ? 'rotate-1' : '-rotate-1'} hover:rotate-0 hover:z-10 relative`}>
                    
                    {/* Header Panel */}
                    <div className="p-4 sm:p-6 border-b-4 border-[#000] bg-[#32ade6] flex items-center gap-3 sm:gap-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white border-4 border-[#000] flex items-center justify-center shadow-[4px_4px_0px_#000]">
                        <UserCircle className="w-8 h-8 sm:w-10 sm:h-10 text-[#000]" />
                      </div>
                      <div>
                        <p className="text-xs sm:text-sm font-bangers tracking-widest text-[#000]">SELLER</p>
                        <p className="comic-title text-2xl sm:text-3xl text-white mt-1 break-words line-clamp-1">{product.sellerName}</p>
                      </div>
                    </div>
                    
                    {/* Content Panel */}
                    <div className="p-6 sm:p-8 flex-1 flex flex-col bg-[#fff] relative">
                      {/* Halftone dots in background of panel */}
                      <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.1)_2px,transparent_2px)] bg-[size:10px_10px] opacity-30 pointer-events-none"></div>
                      
                      <h2 className="comic-title text-3xl sm:text-4xl text-white mb-4 sm:mb-6 relative z-10 break-words">
                        {product.name}
                      </h2>
                      
                      <div className="bg-[#f8fafc] p-4 sm:p-6 border-4 border-[#000] mb-6 sm:mb-8 flex-1 shadow-[4px_4px_0px_#000] relative z-10 w-full flex items-center justify-center">
                        <p className="comic-title text-5xl sm:text-6xl text-[#34c759] break-all text-center">
                          ₹{product.price || 0}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => handleBuy(product.id)}
                        disabled={isBuying !== null || (profile?.balance || 0) < product.price}
                        className={`comic-btn w-full !py-3 sm:!py-6 text-lg sm:text-3xl relative z-10 ${((profile?.balance || 0) < product.price) ? 'bg-gray-400' : 'comic-btn-red'}`}
                      >
                        {isBuying === product.id ? <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto" /> : 
                          ((profile?.balance || 0) < product.price) ? <span><Lock className="w-5 h-5 sm:w-8 sm:h-8 inline mr-1 sm:mr-2" /> NO FUNDS</span> : 
                          <span><Tag className="w-5 h-5 sm:w-8 sm:h-8 inline mr-1 sm:mr-2" /> BUY NOW!</span>}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
