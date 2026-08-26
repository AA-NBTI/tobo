'use client'

import { useState } from 'react'
import { suspendAccount, deleteAccount } from '@/app/[locale]/admin/actions'
import BadgeManagementModal from '@/components/admin/BadgeManagementModal'

export default function RobotActionButtons({ userId, userName, currentTab = 'list', badges = [] }: { userId: string, userName?: string, currentTab?: string, badges?: string[] }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleToggleBadge = () => {
    setIsModalOpen(true)
  }

  const handleSuspend = async (suspend: boolean) => {
    if (suspend && !confirm('이용을 정지하시겠습니까?')) return;
    if (!suspend && !confirm('이용 정지를 해제(복구)하시겠습니까?')) return;
    try {
      await suspendAccount(userId, suspend)
    } catch (error) {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 계정과 연관된 모든 게시글 및 데이터가 완전히 영구 삭제됩니다. 진행하시겠습니까?')) return;
    try {
      await deleteAccount(userId)
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <>
      {currentTab === 'list' && (
        <button 
          onClick={() => handleSuspend(true)}
          className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold py-1 px-2.5 rounded transition text-xs whitespace-nowrap shadow-xs"
        >
          🚫 정지
        </button>
      )}
      {currentTab === 'suspended' && (
        <>
          <button 
            onClick={() => handleSuspend(false)}
            className="inline-flex items-center gap-1 bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 font-bold py-1 px-2.5 rounded transition text-xs whitespace-nowrap shadow-xs"
          >
            🔄 복구
          </button>
          <button 
            onClick={() => handleDelete()}
            className="inline-flex items-center gap-1 bg-rose-600 border border-rose-600 text-white hover:bg-rose-700 font-bold py-1 px-2.5 rounded transition text-xs whitespace-nowrap shadow-xs"
          >
            🗑️ 삭제
          </button>
        </>
      )}
      {currentTab === 'badges' && (
        <button 
          onClick={handleToggleBadge}
          className={`inline-flex items-center gap-1 border font-bold py-1 px-2.5 rounded transition text-xs whitespace-nowrap shadow-xs ${(badges || []).length > 0 ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
        >
          🎖️ 뱃지 관리
        </button>
      )}
      {isModalOpen && (
        <BadgeManagementModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={userId}
          userName={userName || '오토봇'}
          badges={badges || []}
        />
      )}
    </>
  )
}
