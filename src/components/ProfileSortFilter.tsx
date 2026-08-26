'use client'
import { Link } from '@/i18n/routing'

interface Props {
  userId: string
  currentTab: string
  currentSort: string
}

export default function ProfileSortFilter({ userId, currentTab, currentSort }: Props) {
  const getHref = (sort: string) => `/users/${userId}?tab=${currentTab}&sort=${sort}`

  let options = []
  if (currentTab === 'feeds') {
    options = [
      { value: 'latest', label: '최신순', href: getHref('latest') },
      { value: 'comments', label: '댓글순', href: getHref('comments') },
      { value: 'views', label: '조회순', href: getHref('views') }
    ]
  } else {
    options = [
      { value: 'reactions', label: '베스트', href: getHref('reactions') },
      { value: 'latest', label: '최신순', href: getHref('latest') }
    ]
  }

  return (
    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg self-start mb-4 w-full sm:w-auto">
      {options.map((opt) => {
        const isActive = currentSort === opt.value
        return (
          <Link
            key={opt.value}
            href={opt.href}
            scroll={false}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition cursor-pointer flex-1 text-center sm:flex-none ${
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
