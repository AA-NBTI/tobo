'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import PilotSelectorModal from '@/components/PilotSelectorModal'
import { useActivePersona } from '@/context/ActivePersonaContext'

export default function RobotHeaderButtons({ hasAdmin = true }: { hasAdmin?: boolean }) {
  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false)
  const { activeBot, isPiloting } = useActivePersona()

  return (
    <>
      <div className="inline-flex items-center gap-2 ml-2">
        <button
          onClick={() => setIsPilotModalOpen(true)}
          className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs ${
            isPiloting
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
          }`}
        >
          {isPiloting ? activeBot?.display_name : '파일럿'}
        </button>

        <Link
          href="/posts/new"
          className="px-3.5 py-1.5 bg-black text-white hover:bg-gray-800 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs flex items-center"
        >
          피드
        </Link>
      </div>

      <PilotSelectorModal
        isOpen={isPilotModalOpen}
        onClose={() => setIsPilotModalOpen(false)}
        hasAdmin={hasAdmin}
      />
    </>
  )
}
