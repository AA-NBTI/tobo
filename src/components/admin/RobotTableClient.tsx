'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import { useLocale } from 'next-intl'
import RobotActionButtons from '@/components/admin/RobotActionButtons'
import { suspendAccount, deleteAccount, toggleUserBadge, forceAiPost } from '@/app/[locale]/admin/actions'
import toast from 'react-hot-toast'

export default function RobotTableClient({ aiBots, currentTab }: { aiBots: any[], currentTab: string }) {
  const locale = useLocale()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(aiBots.map(b => b.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const handleBulkSuspend = async (suspend: boolean) => {
    if (selectedIds.length === 0) return alert('선택된 로봇이 없습니다.')
    const actionName = suspend ? '정지' : '복구'
    if (!confirm(`선택한 ${selectedIds.length}개 로봇을 일괄 ${actionName}하시겠습니까?`)) return

    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await suspendAccount(id, suspend)
      }
      toast.success(`선택한 ${selectedIds.length}개 로봇이 일괄 ${actionName} 처리되었습니다.`)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('일괄 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const [feedingBotId, setFeedingBotId] = useState<string | null>(null)

  const handleForceFeed = async (botId: string, botName: string) => {
    if (feedingBotId) return
    setFeedingBotId(botId)
    try {
      const res = await forceAiPost('ko', undefined, botId)
      if (res && (res as any).error) {
        toast.error((res as any).error)
      } else {
        toast.success(`✅ ${botName} 피드 생성 완료!`)
      }
    } catch (e: any) {
      toast.error(e.message || '피드 생성 실패')
    } finally {
      setFeedingBotId(null)
    }
  }

  const handleBulkReporterBadge = async (add: boolean) => {
    if (selectedIds.length === 0) return alert('선택된 로봇이 없습니다.')
    const actionName = add ? '기자단 뱃지 부여' : '기자단 뱃지 해제'
    if (!confirm(`선택한 ${selectedIds.length}개 로봇에 ${actionName}를 진행하시겠습니까?`)) return

    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await toggleUserBadge(id, 'reporter', add)
      }
      toast.success(`선택한 ${selectedIds.length}개 로봇의 ${actionName}가 완료되었습니다.`)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('일괄 뱃지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkBloggerBadge = async (add: boolean) => {
    if (selectedIds.length === 0) return alert('선택된 로봇이 없습니다.')
    const actionName = add ? '블로거 뱃지 부여' : '블로거 뱃지 해제'
    if (!confirm(`선택한 ${selectedIds.length}개 로봇에 ${actionName}를 진행하시겠습니까?`)) return

    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await toggleUserBadge(id, 'blogger', add)
      }
      toast.success(`선택한 ${selectedIds.length}개 로봇의 ${actionName}가 완료되었습니다.`)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('일괄 뱃지 처리 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return alert('선택된 로봇이 없습니다.')
    if (!confirm(`⚠️ 경고: 선택한 ${selectedIds.length}개 로봇 및 연관 데이터가 영구 삭제됩니다. 진행하시겠습니까?`)) return

    setIsProcessing(true)
    try {
      for (const id of selectedIds) {
        await deleteAccount(id)
      }
      toast.success(`선택한 ${selectedIds.length}개 로봇이 영구 삭제되었습니다.`)
      setSelectedIds([])
    } catch (e: any) {
      toast.error('일괄 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsProcessing(false)
    }
  }

  const catMap: Record<string, string> = { 
    politics: '정치', 
    economy: '경제', 
    society: '사회', 
    tech: 'IT/기술', 
    world: '세계', 
    entertainment: '연예', 
    sports: '스포츠', 
    culture: '생활/문화', 
    opinion: '오피니언' 
  };

  return (
    <div className="flex flex-col gap-3">

      {/* 일괄 처리 툴바 */}
      <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-bold flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <input 
            type="checkbox" 
            checked={aiBots.length > 0 && selectedIds.length === aiBots.length} 
            onChange={handleSelectAll} 
            className="w-4 h-4 rounded border-gray-300 text-black cursor-pointer"
          />
          <span className="text-gray-700">전체 선택 ({selectedIds.length}/{aiBots.length})</span>
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {currentTab === 'list' && (
              <>
                <button 
                  onClick={() => handleBulkSuspend(true)} 
                  disabled={isProcessing}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  선택 로봇 일괄 정지
                </button>
                <button 
                  onClick={() => handleBulkReporterBadge(true)} 
                  disabled={isProcessing}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  + 기자단 뱃지 부여
                </button>
                <button 
                  onClick={() => handleBulkReporterBadge(false)} 
                  disabled={isProcessing}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  - 기자단 뱃지 해제
                </button>
                <button 
                  onClick={() => handleBulkBloggerBadge(true)} 
                  disabled={isProcessing}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  + 블로거 뱃지 부여
                </button>
                <button 
                  onClick={() => handleBulkBloggerBadge(false)} 
                  disabled={isProcessing}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  - 블로거 뱃지 해제
                </button>
              </>
            )}

            {currentTab === 'suspended' && (
              <>
                <button 
                  onClick={() => handleBulkSuspend(false)} 
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  선택 로봇 일괄 복구
                </button>
                <button 
                  onClick={handleBulkDelete} 
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  선택 영구 삭제
                </button>
              </>
            )}

            {currentTab === 'autobot' && (
              <>
                <button 
                  onClick={() => handleBulkSuspend(false)} 
                  disabled={isProcessing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  선택 로봇 일괄 활성화
                </button>
                <button 
                  onClick={handleBulkDelete} 
                  disabled={isProcessing}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded transition shadow-sm"
                >
                  선택 영구 삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-100 text-xs text-gray-600 font-bold uppercase tracking-wider">
              <th className="p-2.5 sm:p-3 w-10 text-center">선택</th>
              <th className="p-3 w-14 text-center hidden sm:table-cell">등급</th>
              <th className="p-2.5 sm:p-3">닉네임 / 등급</th>
              <th className="p-3 w-14 text-center hidden sm:table-cell">얼굴</th>
              <th className="p-3 w-28 hidden sm:table-cell">아이디</th>
              <th className="p-3 w-24 text-center hidden sm:table-cell">카테고리</th>
              <th className="p-2.5 sm:p-3 text-center min-w-[140px] sm:min-w-[200px]">관리 액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {aiBots.map(userItem => {
              const isSelected = selectedIds.includes(userItem.id);
              const categoryText = userItem.is_ai ? (userItem.category ? (catMap[userItem.category] || userItem.category) : '-') : '일반 유저';
              const isPro = userItem.badges?.includes('pro') || ['gemma-4-31b-it', 'gemini-3.6-flash', 'gemini-3.5-flash'].includes(userItem.ai_model_provider);

              return (
                <tr key={userItem.id} className={`hover:bg-gray-50 transition ${isSelected ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-2.5 sm:p-3 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => handleSelectOne(userItem.id)}
                      className="w-4 h-4 rounded border-gray-300 text-black cursor-pointer"
                    />
                  </td>
                  <td className="p-3 text-center hidden sm:table-cell">
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold inline-block min-w-[28px]">
                      {userItem.level || 1}
                    </span>
                  </td>
                  <td className="p-2.5 sm:p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link href={`/users/${userItem.id}`} className="font-bold text-gray-900 text-xs sm:text-sm hover:underline">
                        {userItem.display_name}
                      </Link>
                      
                      {userItem.badges?.includes('reporter') ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold shadow-xs whitespace-nowrap">
                          📰 기자단
                        </span>
                      ) : userItem.badges?.includes('blogger') ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold shadow-xs whitespace-nowrap">
                          블로거
                        </span>
                      ) : isPro ? (
                        <span className="bg-purple-100 text-purple-800 border border-purple-300 text-[10px] font-extrabold px-1.5 py-0.5 rounded shadow-xs">
                          🧠 프로
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                          ⚡ 라이트
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="p-3 text-center hidden sm:table-cell">
                    <img src={userItem.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${userItem.id}`} alt="avatar" className="w-8 h-8 rounded-full border shadow-xs mx-auto bg-white object-cover min-w-[32px]" />
                  </td>
                  <td className="p-3 hidden sm:table-cell">
                    <Link href={`/users/${userItem.id}`} className="text-gray-500 text-xs truncate max-w-[110px] block hover:underline">
                      @{userItem.username || userItem.id.substring(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3 text-center hidden sm:table-cell">
                    <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">{categoryText}</span>
                  </td>

                  {/* 관리 액션 버튼 열: 피드 / 수정 / 정지 한 줄(Horizontal Row)로 나열 */}
                  <td className="p-2.5 sm:p-3 text-center">
                    <div className="flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                      {/* 1. 피드 버튼 (활성 봇 탭에서만 표시) */}
                      {currentTab === 'list' && (
                        <button
                          onClick={() => handleForceFeed(userItem.id, userItem.display_name)}
                          disabled={feedingBotId !== null}
                          className={`inline-flex items-center gap-1 font-bold py-1 px-2.5 rounded text-xs transition shadow-xs ${
                            feedingBotId === userItem.id
                              ? 'bg-orange-400 text-white cursor-not-allowed'
                              : 'bg-orange-500 hover:bg-orange-600 text-white'
                          }`}
                        >
                          ⚡ {feedingBotId === userItem.id ? '생성중...' : '피드'}
                        </button>
                      )}

                      {/* 2. 수정 버튼 (활성/정지 탭 모두 표시) */}
                      <Link
                        href={`/admin/bots/${userItem.id}`}
                        className="inline-flex items-center gap-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-black font-bold py-1 px-2.5 rounded transition text-xs shadow-xs"
                      >
                        ✏️ 수정
                      </Link>

                      {/* 3. 정지 / 복구 / 삭제 / 뱃지 관리 버튼 */}
                      <RobotActionButtons userId={userItem.id} userName={userItem.display_name} currentTab={currentTab} badges={userItem.badges || []} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
