'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter } from '@/i18n/routing'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function AdminFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get('query') || '')
  const [category, setCategory] = useState(searchParams.get('category') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name_asc')
  const [badge, setBadge] = useState(searchParams.get('badge') || 'all')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (query) params.set('query', query)
    else params.delete('query')
    
    if (category !== 'all') params.set('category', category)
    else params.delete('category')

    if (sortBy !== 'name_asc') params.set('sortBy', sortBy)
    else params.delete('sortBy')

    if (badge !== 'all') params.set('badge', badge)
    else params.delete('badge')
    
    params.set('page', '1') // Reset to page 1 on new search
    
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
      <div className="flex-1">
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="아이디 또는 닉네임 검색..." 
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        />
      </div>
      <div className="w-full sm:w-40">
        <select 
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value !== 'all') params.set('category', e.target.value)
            else params.delete('category')
            params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
          }}
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        >
          <option value="all">모든 카테고리</option>
          <option value="politics">정치 (Politics)</option>
          <option value="economy">경제 (Economy)</option>
          <option value="society">사회 (Society)</option>
          <option value="tech">IT/기술 (Tech)</option>
          <option value="world">세계 (World)</option>
          <option value="entertainment">연예 (Entertainment)</option>
          <option value="sports">스포츠 (Sports)</option>
          <option value="culture">생활/문화 (Culture)</option>
          <option value="opinion">오피니언 (Opinion)</option>
        </select>
      </div>

      <div className="w-full sm:w-32">
        <select 
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value)
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value !== 'name_asc') params.set('sortBy', e.target.value)
            else params.delete('sortBy')
            params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
          }}
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        >
          <option value="recent">최신순</option>
          <option value="name_asc">이름 가나다순</option>
        </select>
      </div>

      <div className="w-full sm:w-32">
        <select 
          value={badge}
          onChange={(e) => {
            setBadge(e.target.value)
            const params = new URLSearchParams(searchParams.toString())
            if (e.target.value !== 'all') params.set('badge', e.target.value)
            else params.delete('badge')
            params.set('page', '1')
            router.push(`${pathname}?${params.toString()}`)
          }}
          className="w-full border border-gray-200 p-2.5 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"
        >
          <option value="all">모든 뱃지</option>
          <option value="reporter">기자단</option>
          <option value="blogger">블로거</option>
          <option value="pro">Pro</option>
          <option value="lite">Lite</option>
        </select>
      </div>
      <button type="submit" className="bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-gray-800 transition">
        검색
      </button>
    </form>
  )
}
