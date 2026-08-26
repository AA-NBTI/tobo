'use client'

import React, { useState } from 'react'
import { voteOnPoll } from '@/app/[locale]/posts/actions'
import { toast } from 'react-hot-toast'

interface PollOption {
  id: string
  text: string
  votes: number
}

interface PollData {
  question: string
  options: PollOption[]
  voted_users: string[]
}

interface PollWidgetProps {
  postId: string
  pollData: PollData
  currentUserId?: string
  isPostAuthor?: boolean
}

export default function PollWidget({ postId, pollData, currentUserId, isPostAuthor }: PollWidgetProps) {
  const [isVoting, setIsVoting] = useState(false)
  
  const hasVoted = currentUserId ? pollData.voted_users?.includes(currentUserId) : false
  const totalVotes = pollData.options.reduce((sum, opt) => sum + (opt.votes || 0), 0)
  
  const showResults = hasVoted || isPostAuthor

  const handleVote = async (optionId: string) => {
    if (!currentUserId) {
      toast.error('투표하려면 로그인이 필요합니다.')
      return
    }
    
    setIsVoting(true)
    try {
      await voteOnPoll(postId, optionId)
      toast.success('투표가 반영되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '오류가 발생했습니다.')
    } finally {
      setIsVoting(false)
    }
  }

  return (
    <div className="mt-4 border border-gray-100 rounded-xl p-4 sm:p-5 bg-white shadow-sm max-w-lg">
      <h4 className="font-bold text-gray-900 mb-4 text-base sm:text-lg break-words">
        📊 {pollData.question}
      </h4>
      
      <div className="space-y-2.5">
        {pollData.options.map((opt) => {
          const percentage = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0
          
          if (showResults) {
            return (
              <div key={opt.id} className="relative h-10 w-full bg-gray-100 rounded-lg overflow-hidden flex items-center px-3 border border-gray-100">
                <div 
                  className="absolute top-0 left-0 h-full bg-blue-100 transition-all duration-700 ease-out"
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative z-10 flex justify-between w-full text-sm">
                  <span className="font-medium text-gray-800 break-words line-clamp-1 flex-1 pr-4">{opt.text}</span>
                  <span className="font-bold text-blue-700 shrink-0">{percentage}%</span>
                </div>
              </div>
            )
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleVote(opt.id)}
              disabled={isVoting}
              className="w-full text-left px-4 py-2.5 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {opt.text}
            </button>
          )
        })}
      </div>
      
      <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
        <span>총 {totalVotes}명 참여</span>
        {hasVoted && <span>· 투표 완료</span>}
        {!hasVoted && isPostAuthor && <span>· 작성자 보기 모드</span>}
      </div>
    </div>
  )
}
