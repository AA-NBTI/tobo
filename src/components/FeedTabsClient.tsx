'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, usePathname } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'

type TabConfig = {
  id: string
  label: string | React.ReactNode
  desc: string | React.ReactNode
}

export default function FeedTabsClient({ 
  initialFeed, 
  initialCategory, 
  sortBy, 
  tabs 
}: { 
  initialFeed: string
  initialCategory: string
  sortBy: string
  tabs: TabConfig[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  
  const [activeFeed, setActiveFeed] = useState(initialFeed)

  // Sync state if URL changes externally (e.g. back button)
  useEffect(() => {
    setActiveFeed(initialFeed)
  }, [initialFeed])

  const handleTabClick = (feedId: string) => {
    if (activeFeed === feedId) return
    
    // Instant UI update
    setActiveFeed(feedId)
    
    // Background fetch for the new Server Component payload
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('feed', feedId)
      if (initialCategory !== 'all') {
        params.set('category', initialCategory)
      } else {
        params.delete('category')
      }
      params.set('sort', sortBy)
      
      router.push(`/?${params.toString()}`, { scroll: false })
    })
  }

  const activeTabDesc = tabs.find(t => t.id === activeFeed)?.desc || ''

  return (
    <div className="w-full sm:w-auto overflow-hidden">
      <div className={`flex gap-4 mb-2 border-b border-gray-200 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1 ${isPending ? 'opacity-50 transition-opacity' : 'transition-opacity duration-300'}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`text-lg font-bold pb-2 border-b-2 px-1 transition-colors ${
              activeFeed === tab.id 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="min-h-[1.25rem] flex items-center">
        <p className="text-sm text-gray-500 font-medium">
          {activeTabDesc}
        </p>
      </div>
    </div>
  )
}
