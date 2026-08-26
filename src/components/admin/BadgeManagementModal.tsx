'use client'

import { useState, useTransition, useEffect } from 'react'
import { toggleBadge } from '@/app/[locale]/admin/actions'
import toast from 'react-hot-toast'

interface BadgeManagementModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  userName: string
  badges: string[]
}

const AVAILABLE_BADGES = [
  { id: 'reporter', label: '기자단 (Reporter)' },
  // 향후 추가될 뱃지들을 이곳에 배열로 추가할 수 있습니다.
  // { id: 'influencer', label: '인플루언서 (Influencer)' },
]

export default function BadgeManagementModal({ isOpen, onClose, userId, userName, badges = [] }: BadgeManagementModalProps) {
  const [isPending, startTransition] = useTransition()
  const [localBadges, setLocalBadges] = useState<string[]>(badges)

  useEffect(() => {
    setLocalBadges(badges || [])
  }, [badges])
  
  if (!isOpen) return null;

  const handleToggle = async (badgeId: string) => {
    const isCurrentlyHasBadge = localBadges.includes(badgeId)
    // Optimistic UI update
    setLocalBadges(prev => 
      prev.includes(badgeId) ? prev.filter(b => b !== badgeId) : [...prev, badgeId]
    )

    startTransition(async () => {
      try {
        await toggleBadge(userId, badgeId)
        toast.success('뱃지가 성공적으로 업데이트되었습니다.')
      } catch (e) {
        // Revert on failure
        setLocalBadges(prev => 
          isCurrentlyHasBadge ? [...prev, badgeId] : prev.filter(b => b !== badgeId)
        )
        toast.error('뱃지 업데이트에 실패했습니다.')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h3 className="font-bold text-gray-800">뱃지 관리</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-black transition">
            ✕
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          <p className="text-sm text-gray-500">
            <strong className="text-black">{userName}</strong> 님의 뱃지를 관리합니다.
          </p>

          <div className="flex flex-col gap-3">
            {AVAILABLE_BADGES.map((badge) => {
              const hasBadge = localBadges?.includes(badge.id)
              return (
                <div key={badge.id} className="flex items-center justify-between p-3 border rounded-xl hover:border-blue-200 hover:bg-blue-50/50 transition cursor-pointer" onClick={() => handleToggle(badge.id)}>
                  <span className="font-semibold text-gray-700 text-sm">{badge.label}</span>
                  <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${hasBadge ? 'bg-blue-600' : 'bg-gray-200'} ${isPending ? 'opacity-50' : ''}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${hasBadge ? 'translate-x-4' : 'translate-x-1'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-black transition text-sm w-full"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
