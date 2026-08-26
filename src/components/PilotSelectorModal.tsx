'use client'

import { useState, useEffect } from 'react'
import { useActivePersona } from '@/context/ActivePersonaContext'
import { createClient } from '@/utils/supabase/client'

export default function PilotSelectorModal({
  isOpen,
  onClose,
  hasAdmin = false,
  userId
}: {
  isOpen: boolean
  onClose: () => void
  hasAdmin?: boolean
  userId?: string
}) {
  const { activeBot, setPilotingBot, clearPiloting } = useActivePersona()
  const [bots, setBots] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchBots()
    }
  }, [isOpen, hasAdmin, userId])

  const fetchBots = async () => {
    setLoading(true)
    const supabase = createClient()

    let query = supabase
      .from('accounts')
      .select('id, display_name, username, avatar_url, category, is_ai, role, status')
      .eq('is_ai', true)

    if (!hasAdmin) {
      // 일반 유저: 승인되어 활성화된 active 봇만 표시
      query = query.eq('status', 'active')
    } else {
      // 관리자: 승인 봇(active) + 검토대기 봇(paused) 모두 표시 (차단된 banned만 제외)
      query = query.neq('status', 'banned')
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50)

    if (error) {
      console.error('[PilotSelectorModal] Fetch bots error:', error)
    }

    setBots(data || [])
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              파일럿 (탑승 선택)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {hasAdmin ? '관리자 권한: 모든 AI 봇(검토대기 포함)에 탑승할 수 있습니다.' : '탑승 가능한 승인된 봇을 선택하여 활동할 수 있습니다.'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100">
            ✕
          </button>
        </div>

        {/* 현재 탑승 상태 */}
        {activeBot ? (
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={activeBot.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=bot'} alt="Avatar" className="w-10 h-10 rounded-full border border-purple-300" />
              <div>
                <div className="text-xs font-semibold text-purple-700">현재 탑승 중인 봇</div>
                <div className="text-sm font-bold text-gray-900">{activeBot.display_name}</div>
              </div>
            </div>
            <button
              onClick={() => {
                clearPiloting()
                onClose()
              }}
              className="px-3 py-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-sm"
            >
              🚪 탑승 해제
            </button>
          </div>
        ) : (
          <div className="bg-gray-50 border rounded-xl p-3 text-xs text-gray-600">
            👤 현재 <strong>휴먼 본인 계정</strong>으로 활동 중입니다. 아래 목록에서 탑승할 봇을 선택하세요.
          </div>
        )}

        {/* 봇 선택 리스트 */}
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {loading ? (
            <div className="text-center py-8 text-xs text-gray-400">봇 목록 로딩 중...</div>
          ) : bots.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              현재 탑승 가능한 활성화 봇이 없습니다. (어드민에서 봇 승인이 필요합니다)
            </div>
          ) : (
            bots.map((bot) => {
              const isCurrent = activeBot?.id === bot.id
              const isPaused = bot.status === 'paused'
              const isMine = bot.claimed_by_user_id === userId

              return (
                <div
                  key={bot.id}
                  onClick={() => {
                    setPilotingBot({
                      id: bot.id,
                      display_name: bot.display_name,
                      avatar_url: bot.avatar_url,
                      username: bot.username,
                      is_ai: true,
                      category: bot.category
                    })
                    onClose()
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-purple-500 bg-purple-50/60 ring-2 ring-purple-200'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img src={bot.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${bot.id}`} alt="Avatar" className="w-9 h-9 rounded-full border" />
                    <div>
                      <div className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                        {bot.display_name}
                        {bot.role === 'mixed' && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-md font-bold">PRO</span>}
                        {isPaused && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-md font-bold">검토대기</span>}
                        {isMine && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md font-bold">내 소유</span>}
                      </div>
                      <div className="text-xs text-gray-400">@{bot.username || 'bot'} • {bot.category || '일반'}</div>
                    </div>
                  </div>
                  <button
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-700'
                    }`}
                  >
                    {isCurrent ? '탑승 중' : '탑승하기'}
                  </button>
                </div>
              )
            })
          )}
        </div>

        <div className="pt-2 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

