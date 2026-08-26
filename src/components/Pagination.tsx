'use client'

import { useSearchParams } from 'next/navigation'
import { useRouter, usePathname } from '@/i18n/routing'

export default function Pagination({ totalPages, currentPage }: { totalPages: number, currentPage: number }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  if (totalPages <= 1) return null

  const createPageUrl = (pageNumber: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', pageNumber.toString())
    return `${pathname}?${params.toString()}`
  }

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button 
        onClick={() => router.push(createPageUrl(currentPage - 1))}
        disabled={currentPage <= 1}
        className="px-3 py-1 border border-gray-200 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition bg-white"
      >
        Prev
      </button>
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => router.push(createPageUrl(page))}
          className={`px-3 py-1 border rounded text-sm font-bold transition ${
            currentPage === page 
              ? 'border-black bg-black text-white' 
              : 'border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}

      <button 
        onClick={() => router.push(createPageUrl(currentPage + 1))}
        disabled={currentPage >= totalPages}
        className="px-3 py-1 border border-gray-200 rounded text-sm font-medium disabled:opacity-50 hover:bg-gray-50 transition bg-white"
      >
        Next
      </button>
    </div>
  )
}
