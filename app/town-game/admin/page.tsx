'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { Loader2, Users, Settings, Zap, LogOut, UserCircle, Eye, EyeOff, Play, Square, Bomb, Search } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [gameState, setGameState] = useState<any>(null)
  const [profiles, setProfiles] = useState<any[]>([])
  const [usersInfo, setUsersInfo] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [buyerAllowance, setBuyerAllowance] = useState('0')

  const [isResetting, setIsResetting] = useState(false)
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [updatingRole, setUpdatingRole] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sellerSearchQuery, setSellerSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'buyer' | 'seller'>('all')
  const [buyLogs, setBuyLogs] = useState<{ id: string, userId: string, ts: number }[]>([])

  useEffect(() => {
    if (buyLogs.length > 0) {
      const timer = setTimeout(() => {
        setBuyLogs([]) // Clear marquee after 15 seconds
      }, 15000)
      return () => clearTimeout(timer)
    }
  }, [buyLogs])

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('game_profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/town-game/profile')
        return
      }

      setIsAdmin(true)
      fetchData()
    }
    checkAdmin()
  }, [router, supabase])

  const fetchData = async () => {
    setLoading(true)
    const { data: stateData } = await supabase.from('game_state').select('*').eq('id', 1).single()
    if (stateData) {
      setGameState(stateData)
      setBuyerAllowance(String(stateData.buyer_allowance || 0))
    }

    const { data: profileData } = await supabase.from('game_profiles').select('*')
    if (profileData) setProfiles(profileData)

    const { data: userData } = await supabase.from('users').select('id, name, email')
    if (userData) setUsersInfo(userData)

    const { data: productData } = await supabase.from('game_products').select('*')
    if (productData) {
      setProducts(productData)
      const initialNames: Record<string, string> = {}
      productData.forEach((p: any) => { initialNames[p.seller_id] = p.name })
      setProductNames(initialNames)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!isAdmin) return

    const stateSub = supabase.channel('public:game_state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, payload => {
        setGameState(payload.new)
      }).subscribe()

    const profileSub = supabase.channel('public:game_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_profiles' }, payload => {
        if (payload.eventType === 'INSERT') {
          setProfiles(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          })
        }
        else if (payload.eventType === 'UPDATE') {
          setProfiles(prev => {
            const oldProfile = prev.find(p => p.id === payload.new.id)
            if (oldProfile && !oldProfile.has_purchased && payload.new.has_purchased) {
              setBuyLogs([{ id: Math.random().toString(), userId: payload.new.id, ts: Date.now() }])
            }
            return prev.map(p => p.id === payload.new.id ? payload.new : p)
          })
        }
      }).subscribe()

    const productSub = supabase.channel('public:game_products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_products' }, payload => {
        if (payload.eventType === 'INSERT') {
          setProducts(prev => {
            if (prev.find(p => p.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          })
          setProductNames(prev => ({ ...prev, [payload.new.seller_id]: payload.new.name }))
        } else if (payload.eventType === 'UPDATE') {
          setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
        } else if (payload.eventType === 'DELETE') {
          setProducts(prev => prev.filter(p => p.id !== payload.old.id))
        }
      }).subscribe()

    const usersSub = supabase.channel('public:users')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, payload => {
        setUsersInfo(prev => {
          const exists = prev.find(u => u.id === payload.new.id)
          if (exists) return prev
          return [...prev, payload.new]
        })
      }).subscribe()

    return () => {
      supabase.removeChannel(stateSub)
      supabase.removeChannel(profileSub)
      supabase.removeChannel(productSub)
      supabase.removeChannel(usersSub)
    }
  }, [isAdmin, supabase])

  const mergedPlayers = useMemo(() => {
    return profiles.map(profile => {
      const userInfo = usersInfo.find(u => u.id === profile.id || u.email === profile.id)
      return {
        ...profile,
        name: userInfo?.name || 'Unknown Player',
        email: userInfo?.email || 'No email'
      }
    })
  }, [profiles, usersInfo])

  const filteredPlayers = useMemo(() => {
    return mergedPlayers.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            player.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === 'all' || player.role === roleFilter
      return matchesSearch && matchesRole
    })
  }, [mergedPlayers, searchQuery, roleFilter])

  const toggleMarketplace = async (open: boolean) => {
    try {
      const res = await fetch('/api/town-game/toggle-market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ open, allowance: Number(buyerAllowance) })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(open ? '💥 BAM! Sales Started!' : '🛑 HALT! Sales Ended!')
    } catch (err: any) {
      toast.error('Failed to toggle sales: ' + err.message)
    }
  }

  const toggleReveal = async () => {
    const newState = !gameState?.results_revealed
    try {
      const res = await fetch('/api/town-game/reveal-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reveal: newState })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success(newState ? '🌟 SHAZAM! Results Revealed!' : '🙈 TOP SECRET! Results Hidden!')
    } catch (err: any) {
      toast.error('Failed to toggle reveal: ' + err.message)
    }
  }

  const handleAssignProduct = async (sellerId: string) => {
    const name = productNames[sellerId]
    if (!name?.trim()) return toast.error('Product name cannot be empty')
    try {
      const res = await fetch('/api/town-game/assign-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId, name })
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('POW! Product assigned!')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleUpdateRole = async (userId: string, newRole: string) => {
    setUpdatingRole(userId)
    try {
      const res = await fetch('/api/town-game/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Role updated to ${newRole.toUpperCase()}!`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleResetGame = async () => {
    if (!confirm('WARNING: This will delete all products, reset all buyers, and wipe the leaderboard. Are you absolutely sure you want to NUKE THE GAME?')) {
      return
    }

    setIsResetting(true)
    try {
      const res = await fetch('/api/town-game/reset', { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('KABOOM! Game has been completely reset!')
      setProductNames({})
      setBuyerAllowance('0')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsResetting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-transparent">
        <Loader2 className="w-16 h-16 animate-spin text-[#000] mb-4" />
        <h1 className="comic-title text-4xl text-white">Loading HQ...</h1>
      </div>
    )
  }

  const sellers = mergedPlayers.filter(p => p.role === 'seller')
  const filteredSellers = sellers.filter(seller => 
    seller.name.toLowerCase().includes(sellerSearchQuery.toLowerCase()) ||
    seller.email.toLowerCase().includes(sellerSearchQuery.toLowerCase())
  )
  const buyers = mergedPlayers.filter(p => p.role === 'buyer')

  return (
    <div className="min-h-[100dvh] bg-transparent text-[#000] font-sans pb-20">
      
      {/* Topbar */}
      <div className="sticky top-0 z-50 border-b-4 border-[#000] bg-white shadow-[0_4px_0px_#000]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-[#ffeb3b] border-4 border-[#000] flex items-center justify-center shadow-[4px_4px_0px_#000] transform -rotate-3">
              <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-[#000]" />
            </div>
            <span className="comic-title text-2xl sm:text-3xl text-center">SELL A THING HQ</span>
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
            <Link href="/town-game/profile/buyer" className="comic-btn comic-btn-blue text-sm sm:text-lg !px-3 !py-1 sm:!px-4 sm:!py-2 text-center transform rotate-1">
              <span>🛒 MARKET</span>
            </Link>
            <button onClick={handleLogout} className="comic-btn bg-white hover:bg-gray-100 flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-lg !px-3 !py-1 sm:!px-4 sm:!py-2 transform -rotate-1">
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" /> <span>ESCAPE</span>
            </button>
          </div>
        </div>
      </div>

      {buyLogs.length > 0 && (
        <div className="bg-[#000] text-[#34c759] font-bangers text-xl sm:text-3xl py-2 sm:py-3 border-b-4 border-[#000] shadow-[0_4px_0px_#000] relative z-40 flex items-center overflow-hidden">
          <div className="w-full animate-marquee whitespace-nowrap">
            {buyLogs.map(log => {
              const user = mergedPlayers.find(p => p.id === log.userId)
              return (
                <span key={log.id} className="mx-8 sm:mx-12">
                  💥 <span className="text-white">{user?.name || 'A HERO'}</span> JUST SECURED AN ITEM! 💥
                </span>
              )
            })}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Controls */}
        <div className="lg:col-span-1 space-y-8">
          
          <div className="comic-panel p-4 sm:p-6 bg-[#ff3b30]">
            <h2 className="comic-title text-2xl sm:text-3xl mb-4 sm:mb-6 text-white text-center sm:text-left">MISSION CONTROL</h2>
            
            <div className="space-y-6">
              <div className="p-3 sm:p-4 border-4 border-[#000] bg-white shadow-[4px_4px_0px_#000] transform rotate-1">
                <h3 className="font-bold mb-3 flex flex-wrap items-center gap-2 text-lg sm:text-xl font-sans uppercase">
                  1. SALES PHASE
                  <span className={`px-2 py-1 border-2 border-black font-bangers text-lg tracking-widest ${gameState?.marketplace_open ? 'bg-[#34c759] text-white' : 'bg-gray-300'}`}>
                    {gameState?.marketplace_open ? 'ACTIVE' : 'STOPPED'}
                  </span>
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-bold mb-2">Buyer Allowance (₹) per round:</label>
                  <input
                    type="number"
                    value={buyerAllowance}
                    onChange={(e) => setBuyerAllowance(e.target.value)}
                    disabled={gameState?.marketplace_open}
                    className="comic-input !py-2 w-full text-lg"
                    placeholder="e.g. 1000"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4">
                  <button onClick={() => toggleMarketplace(true)} disabled={gameState?.marketplace_open} className="comic-btn comic-btn-green w-full sm:flex-1 !text-lg sm:!text-xl !py-2 sm:!py-3">
                    <span>START!</span>
                  </button>
                  <button onClick={() => toggleMarketplace(false)} disabled={!gameState?.marketplace_open} className="comic-btn bg-gray-300 w-full sm:flex-1 !text-lg sm:!text-xl !py-2 sm:!py-3">
                    <span>END!</span>
                  </button>
                </div>
              </div>

              <div className="p-3 sm:p-4 border-4 border-[#000] bg-white shadow-[4px_4px_0px_#000] transform -rotate-1">
                <h3 className="font-bold mb-3 flex flex-wrap items-center gap-2 text-lg sm:text-xl font-sans uppercase">
                  2. TOP SECRET
                  <span className={`px-2 py-1 border-2 border-black font-bangers text-lg tracking-widest ${gameState?.results_revealed ? 'bg-[#32ade6] text-white' : 'bg-gray-300'}`}>
                    {gameState?.results_revealed ? 'REVEALED' : 'HIDDEN'}
                  </span>
                </h3>
                <button onClick={toggleReveal} className={`comic-btn w-full mt-2 !text-lg sm:!text-xl !py-2 sm:!py-3 ${gameState?.results_revealed ? 'bg-gray-300' : 'comic-btn-blue'}`}>
                  <span>{gameState?.results_revealed ? 'HIDE RESULTS' : 'REVEAL RESULTS!'}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="comic-panel p-4 sm:p-6 bg-[#34c759] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 transform rotate-2">
            <div className="action-burst w-20 h-20 sm:w-24 sm:h-24 bg-[#ffeb3b] border-4 border-transparent text-[#000] flex items-center justify-center">
              <Users className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="text-center sm:text-left">
              <p className="comic-title text-4xl sm:text-5xl text-white">{sellers.length + buyers.length}</p>
              <p className="font-bold uppercase text-lg sm:text-xl">Total Players</p>
            </div>
          </div>

          <div className="comic-panel p-4 sm:p-6 bg-[#af52de] flex flex-col sm:flex-row items-center gap-4 sm:gap-6 transform -rotate-1">
            <div className="action-burst w-20 h-20 sm:w-24 sm:h-24 bg-white border-4 border-transparent text-[#000] flex items-center justify-center">
              <span className="comic-title text-4xl sm:text-5xl">🛒</span>
            </div>
            <div className="text-center sm:text-left">
              <p className="comic-title text-4xl sm:text-5xl text-white">
                {buyers.filter(b => b.has_purchased).length} / {buyers.length}
              </p>
              <p className="font-bold uppercase text-lg sm:text-xl text-white">Buyers Purchased</p>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="comic-panel p-6 bg-[#000] border-[#ff3b30] border-4 shadow-[6px_6px_0px_#ff3b30] transform -rotate-1">
            <h2 className="comic-title text-3xl mb-4 text-[#ff3b30] flex items-center gap-2">
              <Bomb className="w-8 h-8" /> DANGER ZONE
            </h2>
            <p className="text-white font-bold mb-4 bg-gray-900 p-4 border-2 border-dashed border-gray-600">
              Clear all products, reset all buyers, and wipe the leaderboard. Start fresh.
            </p>
            <button 
              onClick={handleResetGame} 
              disabled={isResetting}
              className="comic-btn comic-btn-red w-full !text-2xl hover:scale-105"
            >
              {isResetting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : <span>💥 NUKE GAME!</span>}
            </button>
          </div>

        </div>

        {/* Right Col: Sellers */}
        <div className="lg:col-span-2 space-y-8">
          <div className="comic-panel p-6 bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <h2 className="comic-title text-3xl sm:text-4xl text-[#af52de] text-center lg:text-left">SELLERS ROSTER ({sellers.length})</h2>
              <div className="flex w-full lg:w-auto relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Search sellers..." 
                  value={sellerSearchQuery}
                  onChange={(e) => setSellerSearchQuery(e.target.value)}
                  className="comic-input !py-2 !pl-10 flex-1 lg:w-64 min-w-[200px]"
                />
              </div>
            </div>
            
            {filteredSellers.length === 0 ? (
              <div className="p-12 border-4 border-dashed border-[#000] text-center text-gray-500 font-bold text-2xl uppercase">
                No sellers found!
              </div>
            ) : (
              <div className="space-y-6">
                {filteredSellers.map(seller => {
                  const product = products.find(p => p.seller_id === seller.id)
                  return (
                    <div key={seller.id} className="p-4 border-4 border-[#000] bg-[#f8fafc] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[6px_6px_0px_#000] hover:translate-x-1 hover:-translate-y-1 hover:shadow-[8px_8px_0px_#000] transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-[#af52de] border-4 border-[#000] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                          <UserCircle className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="font-bangers text-2xl tracking-wide">{seller.name}</p>
                          <p className="text-sm font-bold text-gray-600">{seller.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                        <input
                          type="text"
                          placeholder="Assign Item..."
                          value={productNames[seller.id] || ''}
                          onChange={(e) => setProductNames(prev => ({ ...prev, [seller.id]: e.target.value }))}
                          className="comic-input !py-2 w-full md:w-48 text-lg"
                        />
                        {(() => {
                          const isSaved = product?.name && product.name === productNames[seller.id]
                          return (
                            <button 
                              onClick={() => handleAssignProduct(seller.id)} 
                              disabled={isSaved || !productNames[seller.id]?.trim()}
                              className={`comic-btn text-white w-full sm:w-auto !py-2 !px-4 text-xl ${isSaved ? 'comic-btn-green' : 'bg-[#af52de]'}`}
                            >
                              <span>{isSaved ? 'SAVED!' : 'SAVE'}</span>
                            </button>
                          )
                        })()}
                      </div>
                      
                      <div className="font-bangers text-xl flex items-center gap-3">
                        {product?.status === 'on_sale' ? (
                          <span className="px-3 py-1 bg-[#34c759] border-2 border-black text-white shadow-[2px_2px_0px_#000] transform rotate-2">LIVE!</span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-200 border-2 border-black shadow-[2px_2px_0px_#000]">DRAFT</span>
                        )}
                        <span className="px-3 py-1 bg-[#ffeb3b] border-2 border-black shadow-[2px_2px_0px_#000] transform -rotate-2">
                          SALES: {product?.sales_count || 0}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="comic-panel p-4 sm:p-6 bg-white mt-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
              <h2 className="comic-title text-3xl sm:text-4xl text-[#32ade6] text-center lg:text-left">ALL PLAYERS ROSTER ({filteredPlayers.length})</h2>
              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text" 
                    placeholder="Search heroes..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="comic-input !py-2 !pl-10 w-full lg:w-64 min-w-[200px]"
                  />
                </div>
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="comic-input !py-2"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admins Only</option>
                  <option value="seller">Sellers Only</option>
                  <option value="buyer">Buyers Only</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredPlayers.length === 0 ? (
                <div className="p-8 text-center border-4 border-dashed border-[#000] text-gray-500 font-bold text-xl uppercase">
                  No heroes found matching your search.
                </div>
              ) : (
                filteredPlayers.map(player => (
                  <div key={player.id} className="p-4 border-4 border-[#000] bg-[#f8fafc] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_#000]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#32ade6] border-4 border-[#000] flex items-center justify-center">
                      <UserCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bangers text-xl tracking-wide">{player.name}</p>
                      <p className="text-xs font-bold text-gray-600">{player.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <select
                      value={player.role}
                      onChange={(e) => handleUpdateRole(player.id, e.target.value)}
                      disabled={updatingRole === player.id}
                      className="comic-input !py-2 !px-3 text-lg font-bold"
                    >
                      <option value="buyer">Buyer</option>
                      <option value="seller">Seller</option>
                      <option value="admin">Admin</option>
                    </select>
                    {updatingRole === player.id && <Loader2 className="w-6 h-6 animate-spin text-[#32ade6]" />}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
