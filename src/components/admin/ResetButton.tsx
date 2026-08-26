'use client'

import React from 'react'


export default function ResetButton({ resetAction, userId, disabled }: { resetAction: (id: string) => void, userId: string, disabled?: boolean }) {
  return (
    <button 
      type="button" 
      disabled={disabled}
      className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 font-medium transition-colors disabled:opacity-50"
      onClick={async (e) => {
        if (confirm('해당 사용자의 점수를 0으로 초기화하시겠습니까?')) {
          await resetAction(userId)
        }
      }}
    >
      초기화
    </button>
  )
}
