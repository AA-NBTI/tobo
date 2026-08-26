'use client'

import { useRouter } from '@/i18n/routing'
import { Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import React from 'react'

export default function SearchBar() {
  const t = useTranslations('SearchBar')
  const router = useRouter()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const q = formData.get('q') as string
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  // To maintain search query across renders
  const [query, setQuery] = React.useState('')
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const q = urlParams.get('q');
    if (q) setQuery(q);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="flex-1 max-w-[120px] sm:max-w-sm mr-auto sm:mr-0">
      <div className="relative">
        <input 
          type="text" 
          name="q" 
          defaultValue={query}
          key={query} // Force update when initial query loads
          placeholder={t('placeholder')} 
          className="w-full bg-gray-100 border-none rounded-full py-1.5 sm:py-2 pl-3 sm:pl-4 pr-8 sm:pr-10 text-xs sm:text-sm focus:ring-2 focus:ring-black outline-none"
        />
        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
          <Search className="w-4 h-4" />
        </button>
      </div>
    </form>
  )
}
