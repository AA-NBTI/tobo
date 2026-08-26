'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'

export interface PilotingBotInfo {
  id: string
  display_name: string
  avatar_url?: string
  username?: string
  is_ai: boolean
  category?: string
}

interface ActivePersonaContextType {
  activeBot: PilotingBotInfo | null
  isPiloting: boolean
  setPilotingBot: (bot: PilotingBotInfo | null) => void
  clearPiloting: () => void
}

const ActivePersonaContext = createContext<ActivePersonaContextType>({
  activeBot: null,
  isPiloting: false,
  setPilotingBot: () => {},
  clearPiloting: () => {}
})

const COOKIE_NAME = 'active_persona_id'

export function ActivePersonaProvider({ children }: { children: React.ReactNode }) {
  const [activeBot, setActiveBot] = useState<PilotingBotInfo | null>(null)

  useEffect(() => {
    // 1. 저장된 봇 탑승 정보 로드
    const stored = localStorage.getItem('piloting_bot')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setActiveBot(parsed)
        document.cookie = `${COOKIE_NAME}=${parsed.id}; path=/; max-age=86400; SameSite=Lax`
      } catch (e) {
        localStorage.removeItem('piloting_bot')
      }
    }
  }, [])

  const setPilotingBot = (bot: PilotingBotInfo | null) => {
    if (bot) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5 text-4xl">
                🚀
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-white/90 uppercase tracking-wider">
                  파일럿 시스템 접속
                </p>
                <p className="mt-1 text-lg font-extrabold text-white">
                  [{bot.display_name}] (으)로 로그인 완료!
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-center' });

      setActiveBot(bot)
      localStorage.setItem('piloting_bot', JSON.stringify(bot))
      document.cookie = `${COOKIE_NAME}=${bot.id}; path=/; max-age=86400; SameSite=Lax`
    } else {
      clearPiloting()
    }
  }

  const clearPiloting = () => {
    // 이미 탑승중인 상태에서만 해제 알림을 띄웁니다
    if (activeBot || localStorage.getItem('piloting_bot')) {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-gray-900 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-white/10`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5 text-4xl">
                🔌
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-black text-gray-400 uppercase tracking-wider">
                  파일럿 시스템 해제
                </p>
                <p className="mt-1 text-lg font-extrabold text-white">
                  휴먼 계정으로 복귀했습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      ), { duration: 4000, position: 'top-center' });
    }

    setActiveBot(null)
    localStorage.removeItem('piloting_bot')
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`
  }

  return (
    <ActivePersonaContext.Provider
      value={{
        activeBot,
        isPiloting: !!activeBot,
        setPilotingBot,
        clearPiloting
      }}
    >
      {children}
    </ActivePersonaContext.Provider>
  )
}

export function useActivePersona() {
  return useContext(ActivePersonaContext)
}
