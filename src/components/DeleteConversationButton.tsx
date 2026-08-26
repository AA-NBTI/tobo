'use client'

import React from 'react'

export default function DeleteConversationButton({ 
  onAction,
  title
}: { 
  onAction: string | ((formData: FormData) => void | Promise<void>) | undefined,
  title?: string
}) {
  return (
    <button
      type="submit"
      formAction={onAction}
      title={title}
      className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      onClick={(e) => {
        if (!confirm('이 대화방에서 나가시겠습니까?')) {
          e.preventDefault()
        }
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>
    </button>
  )
}
