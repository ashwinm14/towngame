'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import { ArrowLeft, Loader2, Gamepad2, UserPlus, LogIn } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createBrowserSupabaseClient()
  
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isLogin) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error('Authentication Failed: ' + error.message)
      } else if (data.session) {
        toast.success('BAM! Login Successful!')
        router.push('/')
        router.refresh()
      }
    } else {
      if (!name.trim()) {
        toast.error('Heroes need a name!')
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            full_name: name
          }
        }
      })

      if (error) {
        toast.error('Registration Failed: ' + error.message)
      } else {
        toast.success('BOOM! Account created! Entering Portal...')
        router.push('/')
        router.refresh()
      }
    }
    setLoading(false)
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col md:flex-row overflow-hidden bg-transparent font-sans text-[#000]">
      
      {/* Background Burst */}
      <div className="absolute top-0 right-0 w-[200%] h-[200%] bg-[#ff3b30] action-burst z-[-2] opacity-10 animate-spin-slow pointer-events-none"></div>

      {/* Left Column (Branding Panel) */}
      <div className="w-full md:w-[45%] lg:w-[50%] p-8 lg:p-12 flex flex-col justify-between border-b-4 md:border-b-0 md:border-r-8 border-[#000] bg-[#ffeb3b] relative z-10">
        
        <Link href="/" className="comic-btn bg-white !px-3 sm:!px-4 !py-2 w-max text-sm sm:text-lg flex items-center gap-2 transform -rotate-2">
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" /> <span>RETREAT</span>
        </Link>

        <div className="flex-1 flex flex-col justify-center mt-8 sm:mt-12 md:mt-0 relative">
          <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#32ade6] border-4 border-[#000] shadow-[6px_6px_0px_#000] flex items-center justify-center mb-6 sm:mb-8 transform -rotate-6 p-3">
            <img src="/tvc_w.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          
          <h1 className="comic-title text-4xl sm:text-6xl lg:text-8xl text-white mb-6 transform rotate-2">
            WELCOME<br/>TO THE PORTAL!
          </h1>
          
          <div className="bg-white p-4 sm:p-6 border-4 border-[#000] shadow-[6px_6px_0px_#000] transform -rotate-1 max-w-md">
            <p className="text-base sm:text-xl font-bold">
              Join the multiverse of games! Create your hero persona and secure your credentials to access all available arenas.
            </p>
          </div>
        </div>

        <div className="hidden md:block mt-12">
          <p className="text-lg sm:text-xl font-bangers tracking-widest text-[#000]">PORTAL SECURE ACCESS</p>
        </div>
      </div>

      {/* Right Column (Login Panel) */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 bg-transparent">
        
        <div className="comic-panel w-full max-w-md p-8 lg:p-10 transform rotate-1">
          
          <div className="mb-6 sm:mb-8">
            <h2 className="comic-title text-3xl sm:text-4xl text-[#32ade6] mb-2">
              {isLogin ? 'IDENTIFY YOURSELF' : 'RECRUIT NEW HERO'}
            </h2>
            <p className="font-bold text-gray-600 text-sm sm:text-base">
              {isLogin ? 'Enter your credentials to access the portal.' : 'Register a new account to join the multiverse.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-xl font-bangers tracking-widest pl-2">HERO NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="comic-input"
                  placeholder="Super Hero Name"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xl font-bangers tracking-widest pl-2">EMAIL ADDRESS</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="comic-input"
                placeholder="hero@arena.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xl font-bangers tracking-widest pl-2">PASSWORD</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="comic-input"
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`comic-btn w-full !py-3 sm:!py-4 text-2xl sm:text-3xl mt-6 transform -rotate-1 ${isLogin ? 'comic-btn-blue' : 'comic-btn-green'}`}
            >
              {loading ? (
                <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin mx-auto" />
              ) : (
                <span>{isLogin ? 'LOG IN!' : 'SIGN UP!'}</span>
              )}
            </button>
          </form>

          <div className="mt-8 bg-[#f8fafc] p-4 border-4 border-[#000] border-dashed text-center">
            <p className="text-lg font-bold flex flex-col items-center justify-center gap-2">
              {isLogin ? (
                <>
                  <span>New to the arena?</span>
                  <button 
                    onClick={() => setIsLogin(false)}
                    className="flex items-center gap-2 text-[#32ade6] hover:text-[#000] transition-colors uppercase font-bangers tracking-widest text-xl"
                  >
                    <UserPlus className="w-5 h-5" /> Enlist Here!
                  </button>
                </>
              ) : (
                <>
                  <span>Already a hero?</span>
                  <button 
                    onClick={() => setIsLogin(true)}
                    className="flex items-center gap-2 text-[#34c759] hover:text-[#000] transition-colors uppercase font-bangers tracking-widest text-xl"
                  >
                    <LogIn className="w-5 h-5" /> Back to Login
                  </button>
                </>
              )}
            </p>
          </div>

        </div>
      </div>

    </div>
  )
}
