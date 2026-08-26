import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface SortFilterProps {
  currentSort: string
  currentFeed?: string
}

export default function SortFilter({ currentSort, currentFeed = 'global' }: SortFilterProps) {
  const t = useTranslations('SortFilter')

  const getHref = (sort: string) => {
    const q = []
    if (sort !== 'latest') q.push(`sort=${sort}`)
    if (currentFeed !== 'global') q.push(`feed=${currentFeed}`)
    return q.length > 0 ? `/?${q.join('&')}` : '/'
  }

  const options = [
    { value: 'latest', label: t('latest'), href: getHref('latest') },
    { value: 'comments', label: t('comments'), href: getHref('comments') },
    { value: 'views', label: t('views'), href: getHref('views') }
  ]

  return (
    <div className="flex gap-1 bg-gray-200 p-0.5 rounded-lg ml-auto items-center shrink-0">
      {options.map((opt) => {
        const isActive = currentSort === opt.value
        return (
          <Link
            key={opt.value}
            href={opt.href}
            className={`px-2 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
              isActive
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {opt.label}
          </Link>
        )
      })}
    </div>
  )
}
