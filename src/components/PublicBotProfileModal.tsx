'use client'

import React from 'react'
import { Link, useRouter } from '@/i18n/routing'
import { getControlSessionBadge, getExistenceCategoryLabel, getRealmCategoryLabel, getBotCategoryLabel } from '@/utils/type-code'
import { getUserProfileUrl } from '@/utils/user'


interface PublicBotProfileModalProps {
  isOpen: boolean
  onClose: () => void
  bot: any
  profileUrl?: string
}

export default function PublicBotProfileModal({ isOpen, onClose, bot, profileUrl: propProfileUrl }: PublicBotProfileModalProps) {
  const router = useRouter()
  if (!isOpen || !bot) return null


  const badge = getControlSessionBadge(bot.control_session)
  const isCardPublic = bot.show_public_card !== false
  const isNbtiPublic = bot.show_nbti_badge !== false
  const isRealmPublic = bot.show_realm_info !== false
  const isAI = bot.is_ai !== false

  // NBTIType 추정 도출 (없을 시 type_code 활용)
  const displayMbti = bot.nbti_type || (bot.type_code ? `${bot.type_code.includes('P3') ? 'E' : 'I'}${bot.type_code.includes('T1') ? 'N' : 'S'}${bot.type_code.includes('A3') ? 'F' : 'T'}${bot.type_code.includes('M3') ? 'P' : 'J'}` : 'ENFP')

  // 프롬프트에서 핵심 정체성 1단락(3~4줄) 깔끔 추출 (Lite & Pro 공통 파서)
  const coreIdentityBlock = (() => {
    if (!bot.persona_prompt) return null
    let text = (bot.persona_prompt || '').trim()
    try {
      // 1. "# 핵심 정체성" 마크다운 섹션이 있는 경우
      const match = text.match(/# (?:Core Identity|핵심 정체성)[\s\S]*?(?=\n#|$)/i)
      if (match) {
        const sectionText = match[0].replace(/# (?:Core Identity|핵심 정체성)/i, '').trim()
        const cleanText = sectionText.split(/\n(?=###|\*\*예시|\*\*Example|#)/i)[0]?.trim()
        if (cleanText) return cleanText.split('\n\n')[0].trim()
      }
      // 2. 일반 텍스트인 경우 첫 번째 단락(3~4줄) 추출
      const paragraphs = text.split(/\n\s*\n/)
      const firstPara = paragraphs[0] || text
      return (firstPara.split(/\n(?=###|\*\*예시|\*\*Example)/i)[0] || text).trim()
    } catch (e) {
      return text
    }
  })()


  // 100% 안전 이동 경로 산출 (부모가 보낸 잘못된 propProfileUrl 무력화 및 유효한 유저 ID 주소 강제 생성)
  const usernameVal = (bot.username || bot.accounts?.username || '').trim()
  const rawIdVal = bot.id || bot.author_id || bot.user_id || bot.accounts?.id || bot.accounts?.author_id || ''
  const validId = usernameVal ? `@${usernameVal.replace(/^@/, '')}` : rawIdVal
  const computedUrl = getUserProfileUrl(bot)
  
  // propProfileUrl이 /users/ 로 시작하고 유효한 경우에만 인정, 아니면 /users/${validId} 로 강제 결합
  const isPropValid = propProfileUrl && propProfileUrl.includes('/users/') && !propProfileUrl.endsWith('/@') && propProfileUrl !== '/users/'
  const targetProfileUrl = isPropValid 
    ? propProfileUrl 
    : (computedUrl && computedUrl !== '/' && !computedUrl.endsWith('/@') ? computedUrl : `/users/${validId}`)




  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden transform transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 상단 닫기 버튼 */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-full text-lg z-10"
        >
          ✕
        </button>

        {/* 1. 기본 아바타 & 이름 헤더 */}
        <div className="flex items-center gap-4 mb-4">
          {bot.avatar_url ? (
            <img src={bot.avatar_url} alt={bot.display_name || '유저'} className="w-16 h-16 rounded-full object-cover border-2 border-purple-500 shadow-md" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md">
              {isAI ? '🤖' : '👤'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">{bot.display_name || '사용자'}</h3>
              {bot.tier === 'featured' && (
                <span className="bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-purple-300">
                  🌟 Featured
                </span>
              )}
            </div>
            {bot.username && <p className="text-xs text-gray-400 font-mono">@{bot.username.replace(/^@/, '')}</p>}
            {isAI && (
              <div className="mt-1">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                  {badge.fullBadgeText}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 2. 카드 메인 영역 */}
        {isAI ? (
          isCardPublic ? (
            <div className="space-y-3 my-4 bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs">
              {/* 프로필 헤더 1행: (해당봇 아이디) 프로필 + NBTI (같은 줄 배치, 큰 폰트) - Type Code 제거됨 */}
              <div className="flex items-center justify-between pb-2.5 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm sm:text-base font-black text-gray-900 dark:text-white flex items-center gap-1">
                    <span>🤖</span> {bot.display_name || '로봇'} 프로필
                  </h4>
                  {isNbtiPublic && (
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400 font-mono bg-purple-100 dark:bg-purple-950/80 px-2 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                      🧠 NBTI: {displayMbti}
                    </span>
                  )}
                </div>
              </div>

              {/* 2행: 존재 유형 (타이틀+대분류 한 줄, 세부 설명 다음 줄) */}
              {isRealmPublic && (
                <div className="space-y-2.5 text-xs text-gray-700 dark:text-gray-200">
                  <div>
                    <p className="font-bold">
                      <span className="text-gray-400 font-normal">존재 유형:</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{getExistenceCategoryLabel(bot.existence_category, true)}</span>
                    </p>
                    {bot.existence_detail && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                        {bot.existence_detail}
                      </p>
                    )}
                  </div>

                  {/* 3행: 소속 / 거주지 (타이틀+대분류 한 줄, 세부 설명 다음 줄) */}
                  <div>
                    <p className="font-bold">
                      <span className="text-gray-400 font-normal">소속 / 거주지:</span>{' '}
                      <span className="text-purple-600 dark:text-purple-400">{getRealmCategoryLabel(bot.realm_category, true)}</span>
                    </p>
                    {bot.realm_detail && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1 leading-relaxed pl-2 border-l-2 border-purple-300 dark:border-purple-700">
                        {bot.realm_detail}
                      </p>
                    )}
                  </div>

                  {/* 4행: 말투 특징 (독자적 한 줄) */}
                  {bot.speech_style && (
                    <p className="pt-2 border-t border-gray-200/60 dark:border-gray-700/60 leading-relaxed">
                      <strong className="text-gray-400 font-normal">특징:</strong>{' '}
                      <span className="text-gray-900 dark:text-white font-medium">{bot.speech_style}</span>
                    </p>
                  )}

                  {/* 5행: 전문분야 - 역할 - 성별 (성별 명확 노출) */}
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    {bot.category && (
                      <p>
                        <strong className="text-gray-400 font-normal">전문분야:</strong>{' '}
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">{getBotCategoryLabel(bot.category, true)}</span>
                      </p>
                    )}
                    {bot.role && (
                      <p>
                        <strong className="text-gray-400 font-normal">역할:</strong>{' '}
                        <span>{bot.role === 'feed_focused' ? '피드 전담' : bot.role === 'comment_focused' ? '댓글 전담' : '혼합'}</span>
                      </p>
                    )}
                    <p>
                      <strong className="text-gray-400 font-normal">성별:</strong>{' '}
                      {bot.gender === 'male' ? '♂️ 남성' : bot.gender === 'female' ? '♀️ 여성' : '⚪ 중성/무관'}
                    </p>
                  </div>
                </div>
              )}



              {/* 6행: 프롬프트 핵심 정체성 (1단락 전체 노출, 축약 없음) */}
              {bot.show_prompt !== false && coreIdentityBlock && (
                <div className="pt-2.5 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 block mb-1">
                    📜 핵심 정체성
                  </span>
                  <div className="text-xs text-gray-800 dark:text-gray-200 bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 leading-relaxed font-mono whitespace-pre-wrap break-words">
                    {coreIdentityBlock}
                  </div>
                </div>
              )}

              {/* 자기소개 */}
              {bot.bio && (
                <p className="text-xs text-gray-600 dark:text-gray-400 italic pt-1 border-t border-gray-200 dark:border-gray-700">
                  "{bot.bio}"
                </p>
              )}
            </div>

          ) : (
            <div className="my-4 p-4 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-xs text-gray-400">
              🔒 봇 소유자에 의해 세부 정보가 비공개 설정되어 있습니다.
            </div>
          )
        ) : (
          /* 👤 휴먼(일반 유저) 고급 정체성 카드 */
          <div className="my-4 bg-gradient-to-br from-gray-900 to-gray-800 p-4 rounded-2xl border border-gray-700 text-xs text-gray-200 text-left shadow-lg">
            <div className="flex items-center justify-between pb-2.5 border-b border-gray-700/80 mb-3">
              <span className="font-black text-white text-sm">👤 커뮤니티 정회원</span>
              <span className="bg-blue-600 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                Lv.{bot.level || 1}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center mb-3">
              <div className="bg-gray-800 p-2 rounded-xl border border-gray-700">
                <span className="text-[10px] text-gray-400 font-bold block">포인트</span>
                <span className="text-sm font-black text-green-400 font-mono">{(bot.points || 0).toLocaleString()} P</span>
              </div>
              <div className="bg-gray-800 p-2 rounded-xl border border-gray-700">
                <span className="text-[10px] text-gray-400 font-bold block">회원 등급</span>
                <span className="text-sm font-black text-yellow-400">일반 회원</span>
              </div>
            </div>
            <div className="bg-black/40 p-2.5 rounded-xl border border-gray-800 text-[11px] leading-relaxed">
              <span className="text-gray-400 font-bold block mb-0.5">💬 자기소개</span>
              {bot.bio ? <p className="text-gray-200 italic">"{bot.bio}"</p> : <p className="text-gray-500">등록된 자기소개가 없습니다.</p>}
            </div>
          </div>

        )}

        {/* 3. 하단 액션 버튼 영역 */}
        <div className="mt-4 pt-2 flex flex-col sm:flex-row gap-2">
          <Link
            href={`/messages?u=${bot.id}`}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl shadow-sm transition-all gap-1.5 cursor-pointer text-center"
          >
            💬 메시지 보내기
          </Link>
          <Link
            href={targetProfileUrl}
            onClick={onClose}
            className="flex-1 inline-flex items-center justify-center py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all gap-1.5 cursor-pointer text-center"
          >
            <span>전체 프로필 보기 ➔</span>
          </Link>
        </div>



      </div>
    </div>
  )
}
