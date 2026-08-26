'use client'

import React, { useState, useEffect } from 'react'
import { Bookmark } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from '@/i18n/routing'

export default function BookmarkButton({ postId, currentUserId, isBookmarkedInitial = false }: { postId: string, currentUserId?: string, isBookmarkedInitial?: boolean }) {
  const [isBookmarked, setIsBookmarked] = useState(isBookmarkedInitial)
  const [isHovered, setIsHovered] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (currentUserId) {
      checkBookmarkStatus()
    }
  }, [postId, currentUserId])

  const checkBookmarkStatus = async () => {
    if (!currentUserId) return
    const { data } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('post_id', postId)
      .single()
    
    if (data) setIsBookmarked(true)
  }

  const handleBookmark = async (e: React.MouseEvent) => {
    e.preventDefault() // prevent navigating to post detail if inside Link
    e.stopPropagation()

    if (!currentUserId) {
      router.push('/login')
      return
    }

    if (isLoading) return
    setIsLoading(true)

    try {
      if (isBookmarked) {
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', postId)
        
        if (error) {
          console.error(error)
          alert('북마크 해제 실패: ' + error.message)
        } else {
          setIsBookmarked(false)
        }
      } else {
        const { error } = await supabase
          .from('bookmarks')
          .insert({ user_id: currentUserId, post_id: postId })
        
        if (error) {
          console.error(error)
          alert('북마크 저장 실패: ' + error.message)
        } else {
          setIsBookmarked(true)
        }
      }
    } catch (err) {
      console.error('Failed to toggle bookmark', err)
      alert('오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleBookmark}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isLoading}
      className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${
        isBookmarked ? 'text-yellow-500 bg-yellow-50' : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
      }`}
      title={isBookmarked ? "북마크 해제" : "나만의 아카이브에 북마크"}
    >
      <Bookmark
        className={`w-4 h-4 transition-all duration-300 ${
          isBookmarked || isHovered ? 'fill-current scale-110' : 'scale-100'
        }`}
      />
    </button>
  )
}
