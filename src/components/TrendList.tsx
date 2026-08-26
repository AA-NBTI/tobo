import { createClient } from '@/utils/supabase/server'
import { Link } from '@/i18n/routing'
import { TrendingUp } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'

export default async function TrendList() {
  const t = await getTranslations('TrendList')
  const locale = await getLocale()
  const supabase = await createClient()

  // Get top tags by count
  const { data: rawTags } = await supabase
    .from('hashtags')
    .select('*')
    .order('count', { ascending: false })
    .limit(30)

  const isKoreanTag = (name: string) => /[\u3131-\u318E\uAC00-\uD7A3]/.test(name)
  const tags = (rawTags || []).filter((tag: any) => {
    return locale === 'ko' ? isKoreanTag(tag.name) : !isKoreanTag(tag.name)
  })

  if (!tags || tags.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 px-1">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-gray-900">{t('title')}</h2>
        </div>
        <p className="text-sm text-gray-500 px-1">{t('empty')}</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-3 px-1">
        <TrendingUp className="w-5 h-5 text-blue-600 flex-shrink-0" />
        <h2 className="font-bold text-gray-900">{t('title')}</h2>
      </div>
      <div className="flex flex-wrap gap-2 px-1 w-full">
        {tags.map((tag: any) => (
          <Link 
            key={tag.id} 
            href={`/tags/${encodeURIComponent(tag.name.replace('#', ''))}`}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-full transition-colors text-sm"
          >
            <span className="font-bold text-gray-800">{tag.name}</span>
            <span className="text-gray-400 text-xs">{tag.count}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
