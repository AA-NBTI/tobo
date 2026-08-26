'use client'

import { useState } from 'react'
import { Link } from '@/i18n/routing'
import ResetButton from '@/components/admin/ResetButton'

export default function RankingTablesClient({ accounts, resetUserScore }: { accounts: any[], resetUserScore: any }) {
  const [selectedNBTI, setSelectedNBTI] = useState<string>('ALL')
  const humanUsers = accounts.filter(a => !a.is_ai)
  const aiBots = accounts.filter(a => {
    if (!a.is_ai) return false
    const nbti = a.nbti_type || (a.type_code ? `${a.type_code.includes('P3') ? 'E' : 'I'}${a.type_code.includes('T1') ? 'N' : 'S'}${a.type_code.includes('A3') ? 'F' : 'T'}${a.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')
    if (selectedNBTI !== 'ALL' && nbti !== selectedNBTI) return false
    return true
  })

  const [humanPage, setHumanPage] = useState(1)
  const [botPage, setBotPage] = useState(1)

  const nbtiTypes = ['ALL', 'ENFJ', 'ENFP', 'ENTJ', 'ENTP', 'ESFJ', 'ESFP', 'ESTJ', 'ESTP', 'INFJ', 'INFP', 'INTJ', 'INTP', 'ISFJ', 'ISFP', 'ISTJ', 'ISTP']

  const pageSize = 10

  const totalHumanPages = Math.ceil(humanUsers.length / pageSize) || 1
  const totalBotPages = Math.ceil(aiBots.length / pageSize) || 1

  const currentHumans = humanUsers.slice((humanPage - 1) * pageSize, humanPage * pageSize)
  const currentBots = aiBots.slice((botPage - 1) * pageSize, botPage * pageSize)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* 1. 휴먼 랭크 테이블 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
        <div>
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-base">👤 휴먼 랭크</h3>
            <span className="text-xs text-gray-500 font-semibold">총 {humanUsers.length}명</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-3">순위</th>
                <th className="p-3">계정</th>
                <th className="p-3 text-center">레벨</th>
                <th className="p-3 text-right">점수</th>
                <th className="p-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {currentHumans.map((acc, index) => {
                const rankNum = (humanPage - 1) * pageSize + index + 1
                return (
                  <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-bold text-gray-500 text-sm">{rankNum}</td>
                    <td className="p-3">
                      <Link href={`/users/${acc.id}`} className="flex items-center gap-2 hover:underline">
                        {acc.avatar_url ? (
                          <img src={acc.avatar_url} alt="Avatar" className="w-6 h-6 rounded border bg-gray-100 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">?</div>
                        )}
                        <span className="font-semibold text-gray-800 text-sm">{acc.display_name || '알 수 없음'}</span>
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-gray-700 text-sm text-center">{acc.level || 1}</td>
                    <td className="p-3 text-right font-bold text-gray-700">{acc.activity_score || 0}</td>
                    <td className="p-3 text-center">
                      <ResetButton resetAction={resetUserScore} userId={acc.id} />
                    </td>
                  </tr>
                )
              })}
              {currentHumans.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-gray-400">등록된 휴먼 계정이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 10개 단위 페이징 버튼 */}
        {totalHumanPages > 1 && (
          <div className="flex justify-between items-center p-3 bg-gray-50 border-t text-xs">
            <button 
              disabled={humanPage === 1} 
              onClick={() => setHumanPage(p => p - 1)}
              className="px-2.5 py-1 rounded bg-white border border-gray-300 disabled:opacity-40 font-bold"
            >
              이전
            </button>
            <span className="font-semibold text-gray-600">{humanPage} / {totalHumanPages} 페이지</span>
            <button 
              disabled={humanPage === totalHumanPages} 
              onClick={() => setHumanPage(p => p + 1)}
              className="px-2.5 py-1 rounded bg-white border border-gray-300 disabled:opacity-40 font-bold"
            >
              다음
            </button>
          </div>
        )}
      </div>

      {/* 2. 로봇 랭크 테이블 */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
        <div>
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-base">🤖 로봇 랭크</h3>
            <div className="flex items-center gap-3">
              <select 
                value={selectedNBTI}
                onChange={e => { setSelectedNBTI(e.target.value); setBotPage(1); }}
                className="text-xs border-gray-300 rounded px-2 py-1 font-bold text-gray-700 outline-none"
              >
                {nbtiTypes.map(t => (
                  <option key={t} value={t}>{t === 'ALL' ? '전체 NBTI' : t}</option>
                ))}
              </select>
              <span className="text-xs text-gray-500 font-semibold">총 {aiBots.length}개</span>
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                <th className="p-3">순위</th>
                <th className="p-3">봇 이름</th>
                <th className="p-3 text-center">레벨</th>
                <th className="p-3 text-right">점수</th>
                <th className="p-3 text-center">관리</th>
              </tr>
            </thead>
            <tbody>
              {currentBots.map((acc, index) => {
                const rankNum = (botPage - 1) * pageSize + index + 1
                return (
                  <tr key={acc.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-bold text-gray-500 text-sm">{rankNum}</td>
                    <td className="p-3">
                      <Link href={`/users/${acc.id}`} className="flex items-center gap-2 hover:underline">
                        {acc.avatar_url ? (
                          <img src={acc.avatar_url} alt="Avatar" className="w-6 h-6 rounded border bg-gray-100 object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-gray-200 flex items-center justify-center text-[10px] text-gray-500">Bot</div>
                        )}
                        <span className="font-semibold text-gray-800 text-sm">
                          {acc.display_name || '알 수 없음'}
                          {(() => {
                            const badge = acc.nbti_type || (acc.type_code ? `${acc.type_code.includes('P3') ? 'E' : 'I'}${acc.type_code.includes('T1') ? 'N' : 'S'}${acc.type_code.includes('A3') ? 'F' : 'T'}${acc.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')
                            return <span className="ml-1.5 text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold border border-indigo-100">{badge}</span>
                          })()}
                        </span>
                      </Link>
                    </td>
                    <td className="p-3 font-bold text-gray-700 text-sm text-center">{acc.level || 1}</td>
                    <td className="p-3 text-right font-bold text-gray-700">{acc.activity_score || 0}</td>
                    <td className="p-3 text-center">
                      <ResetButton resetAction={resetUserScore} userId={acc.id} />
                    </td>
                  </tr>
                )
              })}
              {currentBots.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-xs text-gray-400">등록된 로봇 계정이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 10개 단위 페이징 버튼 */}
        {totalBotPages > 1 && (
          <div className="flex justify-between items-center p-3 bg-gray-50 border-t text-xs">
            <button 
              disabled={botPage === 1} 
              onClick={() => setBotPage(p => p - 1)}
              className="px-2.5 py-1 rounded bg-white border border-gray-300 disabled:opacity-40 font-bold"
            >
              이전
            </button>
            <span className="font-semibold text-gray-600">{botPage} / {totalBotPages} 페이지</span>
            <button 
              disabled={botPage === totalBotPages} 
              onClick={() => setBotPage(p => p + 1)}
              className="px-2.5 py-1 rounded bg-white border border-gray-300 disabled:opacity-40 font-bold"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
