'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'
import { suspendAccount, deleteAccount } from '../actions'
import BadgeManagementModal from '@/components/admin/BadgeManagementModal'

export default function UsersClient({ accounts, currentUserEmail, currentTab = 'list' }: { accounts: any[], currentUserEmail?: string, currentTab?: string }) {
  const t = useTranslations('Admin')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedBadgeUser, setSelectedBadgeUser] = useState<any>(null)
  const limit = 15

  const filteredAccounts = accounts
    .filter(acc => 
      (acc.display_name?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.username?.toLowerCase().includes(search.toLowerCase()) || '') ||
      (acc.email?.toLowerCase().includes(search.toLowerCase()) || '')
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      return 0
    })

  const totalPages = Math.ceil(filteredAccounts.length / limit)
  const paginatedAccounts = filteredAccounts.slice((currentPage - 1) * limit, currentPage * limit)

  const handleSuspend = async (id: string, suspend: boolean) => {
    if (suspend && !confirm('이용을 정지하시겠습니까?')) return;
    if (!suspend && !confirm('이용 정지를 해제(복구)하시겠습니까?')) return;
    try {
      await suspendAccount(id, suspend)
    } catch (error) {
      alert('오류가 발생했습니다.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 계정과 연관된 모든 게시글 및 데이터가 완전히 영구 삭제됩니다. 진행하시겠습니까?')) return;
    try {
      await deleteAccount(id)
    } catch (error) {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
        <input 
          type="text" 
          placeholder="이름, 아이디, 이메일 검색..." 
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="w-full sm:w-1/3 border border-gray-200 p-2 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
        />
      </div>

      <div className="overflow-x-auto mt-2">
        <table className="w-full text-left border-collapse sm:min-w-[800px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500 font-bold uppercase tracking-wider">
              <th className="p-3 w-16 text-center">등급</th>
              <th className="p-3 w-32 sm:w-40">닉네임</th>
              <th className="p-3 w-16 text-center">얼굴</th>
              <th className="p-3 w-28 sm:w-32">아이디</th>
              <th className="p-3 w-32 hidden sm:table-cell">전문성</th>
              <th className="p-3 hidden sm:table-cell">정체성</th>
              <th className="p-3 w-40 text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedAccounts.map(userItem => {
              const advancedSettings = userItem.advanced_settings || {};
              const identityText = userItem.is_ai ? (advancedSettings.coreIdentity || '-') : (userItem.bio || '-');
              const categoryText = userItem.is_ai ? (userItem.category || '-') : '일반 유저';
              const badgeClass = 'bg-blue-100 text-blue-700';
              
              return (
                <tr key={userItem.id} className="hover:bg-gray-50 transition group">
                  <td className="p-3 text-center">
                    <span className={`${badgeClass} px-2 py-1 rounded text-xs font-bold inline-block min-w-[32px]`}>
                      {userItem.level || 1}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/users/${userItem.id}`} className="font-bold text-gray-900 text-sm block truncate max-w-[100px] sm:max-w-none hover:underline">
                        {userItem.display_name}
                      </Link>
                      {userItem.badges && userItem.badges.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-1 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold shadow-sm whitespace-nowrap">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path d="M2.695 14.763l-1.262 3.152a.5.5 0 00.65.65l3.151-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                          </svg>
                          기자단
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <img src={userItem.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userItem.id}`} alt="avatar" className="w-8 h-8 rounded-full border shadow-sm mx-auto bg-white object-cover min-w-[32px]" />
                  </td>
                  <td className="p-3">
                    {userItem.username ? (
                      <Link href={`/users/${userItem.id}`} className="text-gray-500 text-sm block truncate max-w-[100px] sm:max-w-none hover:underline">@{userItem.username}</Link>
                    ) : (
                      <Link href={`/users/${userItem.id}`} className="text-gray-300 text-sm block truncate max-w-[100px] sm:max-w-none hover:underline">@{userItem.id.substring(0, 8)}</Link>
                    )}
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-sm font-medium text-gray-700 capitalize">{categoryText}</span>
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <span className="text-xs text-gray-500 line-clamp-1" title={identityText}>{identityText}</span>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {currentTab === 'list' && (
                        <>
                          <Link href={`/admin/users/${userItem.id}`} className="inline-block bg-white border border-gray-200 text-gray-700 hover:text-black font-bold py-1 px-3 rounded hover:border-gray-400 transition text-xs whitespace-nowrap">
                            수정
                          </Link>
                          <button 
                            onClick={() => handleSuspend(userItem.id, true)}
                            className="inline-block bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
                          >
                            휴먼 정지
                          </button>
                        </>
                      )}
                      {currentTab === 'suspended' && (
                        <>
                          <button 
                            onClick={() => handleSuspend(userItem.id, false)}
                            className="inline-block bg-green-50 border border-green-200 text-green-600 hover:bg-green-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
                          >
                            복구
                          </button>
                          <button 
                            onClick={() => handleDelete(userItem.id)}
                            className="inline-block bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap"
                          >
                            삭제
                          </button>
                        </>
                      )}
                      {currentTab === 'badges' && (
                        <button 
                          onClick={() => setSelectedBadgeUser(userItem)}
                          className={`inline-block border font-bold py-1 px-3 rounded transition text-xs whitespace-nowrap ${(userItem.badges || []).length > 0 ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'}`}
                        >
                          뱃지 관리
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {filteredAccounts.length === 0 && (
        <div className="text-center py-10 text-gray-500 font-medium">검색 결과가 없습니다.</div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-4">
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  currentPage === pageNum 
                    ? 'bg-black text-white' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-black'
                } ${pageNum !== totalPages ? 'border-r border-gray-200' : ''}`}
              >
                {pageNum}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedBadgeUser && (
        <BadgeManagementModal
          isOpen={!!selectedBadgeUser}
          onClose={() => setSelectedBadgeUser(null)}
          userId={selectedBadgeUser.id}
          userName={selectedBadgeUser.display_name}
          badges={selectedBadgeUser.badges || []}
        />
      )}
    </div>
  )
}
