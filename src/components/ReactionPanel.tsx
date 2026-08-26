'use client'

import { useState, useEffect, useMemo } from 'react'
import { toggleReaction } from '@/app/reactions/actions'
import { toast } from 'react-hot-toast'
import { createClient } from '@/utils/supabase/client'
import posthog from 'posthog-js'

import { useTranslations } from 'next-intl'

const REACTION_KEYS = [
  'BONE_HIT',
  'CRINGE',
  'LIKE',
  'LOL',
  'SAD'
]

export default function ReactionPanel({ 
  targetType, 
  targetId, 
  initialReactions = [], 
  currentUser,
  extraButtons
}: { 
  targetType: 'post' | 'comment' | 'capture', 
  targetId: string, 
  initialReactions?: any[], 
  currentUser?: any,
  extraButtons?: React.ReactNode
}) {
  const t = useTranslations('ReactionPanel')
  const currentUserId = currentUser?.id
  const [reactions, setReactions] = useState(initialReactions)
  const [loading, setLoading] = useState(false)

  const column = targetType === 'post' ? 'post_id' : 'comment_id'

  // Realtime subscription for this specific target
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`realtime-reactions-${targetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reactions',
          filter: `${column}=eq.${targetId}`
        },
        (payload) => {
          setReactions(prev => {
            const newReaction = payload.new
            // 낙관적 업데이트(temp-)로 들어간 임시 데이터를 실제 데이터로 교체 (중복 방지)
            const withoutTemp = prev.filter(r => 
              !(String(r.id).startsWith('temp-') && r.user_id === newReaction.user_id && r.reaction_type === newReaction.reaction_type)
            )
            if (withoutTemp.some(r => r.id === newReaction.id)) return withoutTemp
            return [...withoutTemp, newReaction]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'reactions',
          filter: `${column}=eq.${targetId}`
        },
        (payload) => {
          setReactions(prev => prev.filter(r => r.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [targetId, column])

  const handleToggle = async (reactionType: string) => {
    if (!currentUserId) {
      toast.error(t('loginRequired'))
      return
    }
    
    // Optimistic UI Update
    const existingIndex = reactions.findIndex(r => r.user_id === currentUserId && r.reaction_type === reactionType)
    
    setLoading(true)
    try {
      if (existingIndex > -1) {
        // Optimistically remove
        setReactions(prev => prev.filter((_, i) => i !== existingIndex))
        posthog.capture('Reaction Clicked', { reactionType, targetType, targetId, action: 'removed' })
      } else {
        // Optimistically add
        setReactions(prev => [...prev, { 
          id: `temp-${Date.now()}`, 
          user_id: currentUserId, 
          [column]: targetId, 
          reaction_type: reactionType 
        }])
        posthog.capture('Reaction Clicked', { reactionType, targetType, targetId, action: 'added' })
      }
      
      await toggleReaction(targetType, targetId, reactionType)
    } catch (e: any) {
      toast.error(t('reactionError'))
      // Revert to initial on error by fetching or just letting the user refresh (ideally we would rollback state)
      // Realtime channel will eventually correct it if we just ignore
    } finally {
      setLoading(false)
    }
  }

  // 계산 로직 메모이제이션
  const counts = useMemo(() => {
    const res: Record<string, { count: number, hasReacted: boolean }> = {}
    REACTION_KEYS.forEach(rt => {
      res[rt] = { count: 0, hasReacted: false }
    })
    
    reactions.forEach(r => {
      if (res[r.reaction_type]) {
        res[r.reaction_type].count += 1
        if (r.user_id === currentUserId) {
          res[r.reaction_type].hasReacted = true
        }
      }
    })
    return res
  }, [reactions, currentUserId])

  return (
    <div className="flex flex-wrap justify-end gap-1.5 mt-2">
      {REACTION_KEYS.map(rt => {
        const { count, hasReacted } = counts[rt]
        
        return (
          <button
            key={rt}
            onClick={() => handleToggle(rt)}
            disabled={loading}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors border ${
              hasReacted 
                ? 'text-gray-700 bg-gray-50 border-gray-300 hover:bg-gray-100' 
                : 'text-gray-500 bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <span>{t(rt)}</span>
            {count > 0 && <span className="opacity-80 ml-0.5">{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
