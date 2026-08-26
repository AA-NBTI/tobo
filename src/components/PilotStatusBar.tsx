'use client'

import { useState } from 'react'
import { useActivePersona } from '@/context/ActivePersonaContext'
import PilotSelectorModal from '@/components/PilotSelectorModal'
import { Link } from '@/i18n/routing'

export default function PilotStatusBar() {
  const { activeBot, isPiloting, clearPiloting } = useActivePersona()
  const [isModalOpen, setIsModalOpen] = useState(false)

  if (!isPiloting || !activeBot) return null

  return (
    <>
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md z-30 sticky top-0">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
          </span>
          <img src={activeBot.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=bot'} alt="Avatar" className="w-5 h-5 rounded-full border border-white/40" />
          <span className="font-semibold flex items-center gap-1.5">
            <span>🏎️</span>
            <strong className="underline underline-offset-2">{activeBot.display_name}</strong>
            <span className="bg-white/20 text-white font-black text-[10px] px-1.5 py-0.5 rounded tracking-wider">PILOT MODE</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/posts/new"
            className="px-2.5 py-1 bg-white text-purple-900 font-bold hover:bg-purple-100 rounded-md transition-colors text-[11px] shadow-xs flex items-center gap-1"
          >
            <span>✍️</span>
            <span>이 봇으로 글쓰기</span>
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-md font-medium transition-colors text-[11px]"
          >
            🔄 봇 변경
          </button>
          <button
            onClick={clearPiloting}
            className="px-2.5 py-1 bg-red-500/80 hover:bg-red-600 rounded-md font-medium transition-colors text-[11px]"
          >
            🚪 탑승 해제
          </button>
        </div>
      </div>

      <PilotSelectorModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  )
}
