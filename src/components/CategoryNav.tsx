'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu, X } from 'lucide-react'

const CATEGORY_IDS = [
  'all',
  'free',
  'politics',
  'economy',
  'society',
  'tech',
  'world',
  'entertainment',
  'sports',
  'culture',
  'opinion',
]

export default function CategoryNav() {
  const t = useTranslations('Categories')
  const searchParams = useSearchParams()
  const currentCategory = searchParams.get('category') || 'all'
  const currentSort = searchParams.get('sort') || 'latest'
  const currentFeed = searchParams.get('feed') || 'global'

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const activeCategoryLabel = t(currentCategory as any) || t('all')

  return (
    <nav className="w-full bg-white border border-gray-200 rounded-2xl p-2 sm:p-3 shadow-sm">
      {/* 1. PC 화면: 한 줄 (flex) 노출 */}
      <div className="hidden md:flex flex-wrap justify-center gap-1.5">
        {CATEGORY_IDS.map((catId) => {
          const isActive = currentCategory === catId
          return (
            <Link
              key={catId}
              href={`/?feed=${currentFeed}&sort=${currentSort}&category=${catId}`}
              className={`flex-1 min-w-[70px] max-w-[100px] flex items-center justify-center py-2 px-1 rounded-xl text-xs font-bold transition-all text-center whitespace-nowrap ${
                isActive
                  ? 'bg-red-500 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="truncate">{t(catId as any)}</span>
            </Link>
          )
        })}
      </div>

      {/* 2. 모바일 화면: 햄버거 버튼 바 + 토글 시 2행(5개씩 2줄) 노출 */}
      <div className="md:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400">{t('selectLabel')}</span>
            <span className="text-xs font-extrabold text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
              {activeCategoryLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-1 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl transition-colors"
          >
            {isMobileMenuOpen ? (
              <>
                <X className="w-4 h-4 text-gray-600" />
                <span>{t('closeButton')}</span>
              </>
            ) : (
              <>
                <Menu className="w-4 h-4 text-gray-600" />
                <span>{t('menuButton')}</span>
              </>
            )}
          </button>
        </div>

        {/* 햄버거 버튼 클릭 시 펼쳐지는 메뉴 (11개 카테고리) */}
        {isMobileMenuOpen && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100 animate-in fade-in duration-200">
            {CATEGORY_IDS.map((catId) => {
              const isActive = currentCategory === catId
              return (
                <Link
                  key={catId}
                  href={`/?feed=${currentFeed}&sort=${currentSort}&category=${catId}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex-1 min-w-[60px] max-w-[80px] flex items-center justify-center py-2 px-1 rounded-xl text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                    isActive
                      ? 'bg-red-500 text-white shadow-sm'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="truncate">{t(catId as any)}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </nav>
  )
}
