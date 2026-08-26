'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { Link, useRouter } from '@/i18n/routing'
import PilotSelectorModal from '@/components/PilotSelectorModal'
import { useActivePersona } from '@/context/ActivePersonaContext'
import { createAiBot, toggleAutoBotSettings, toggleAutoFeedSettings } from '@/app/[locale]/admin/actions'

interface AutoBotButtonProps {
  initialIsActive?: boolean
  initialTargetCount?: number
  initialFeedIsActive?: boolean
  initialFeedTargetCount?: number
  pendingBotCount?: number
  pendingFeedCount?: number
  mode?: 'manual' | 'cron' | 'all'
}

export default function AutoBotButton({ 
  initialIsActive = false, 
  initialTargetCount = 29,
  initialFeedIsActive = false,
  initialFeedTargetCount = 19,
  pendingBotCount = 0,
  pendingFeedCount = 0,
  mode = 'all'
}: AutoBotButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'general' | 'pro' | 'cron' | null>(null)
  const [topicKeyword, setTopicKeyword] = useState('')
  
  const [isAutoBotActive, setIsAutoBotActive] = useState(initialIsActive)
  const [autoBotTargetCount, setAutoBotTargetCount] = useState(initialTargetCount)
  
  const [isAutoFeedActive, setIsAutoFeedActive] = useState(initialFeedIsActive)
  const [autoFeedTargetCount, setAutoFeedTargetCount] = useState(initialFeedTargetCount)


  const router = useRouter()

  // 1. 오토봇 라이트 생성 (댓글 전용 — 단 1회 지능형 API 호출)
  const handleGeneralBot = async () => {
    setIsLoading(true)
    setLoadingType('general')
    const toastId = toast.loading('🤖 [오토봇 라이트] 댓글 전용 봇 생성 중...')
    try {
      const res = await fetch('/api/ai-bot-auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'lite', topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '로봇 생성에 실패했습니다.')
      }
      const data = await res.json()
      const displayName = data.displayName || `라이트봇_${Date.now().toString().slice(-4)}`
      const coreIdentity = data.coreIdentity || '댓글 소통 전문 봇'

      // 역할: comment (댓글 전용) 고정
      data.role = 'comment'
      await saveBotToDb(displayName, coreIdentity, data, toastId, '라이트')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  // 2. 오토봇 프로 생성 (피드/심층 보도용 — 단 1회 고도화 통합 API 호출)
  const handleProBot = async () => {
    setIsLoading(true)
    setLoadingType('pro')
    const toastId = toast.loading('✨ [오토봇 프로] 정밀 페르소나 기획 중...')
    try {
      const res = await fetch('/api/ai-bot-auto-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pro', topic_keyword: topicKeyword || undefined })
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || '프로 로봇 생성에 실패했습니다.')
      }
      const data = await res.json()
      const displayName = data.displayName || `프로봇_${Date.now().toString().slice(-4)}`
      const coreIdentity = data.coreIdentity || '깊이 있는 분석 피드 전문 봇'

      // 역할: mixed (피드 작성 가능)
      data.role = data.role || 'mixed'
      await saveBotToDb(displayName, coreIdentity, data, toastId, 'PRO')
    } catch (err: any) {
      toast.error(err.message, { id: toastId })
    } finally {
      setIsLoading(false)
      setLoadingType(null)
    }
  }

  const saveBotToDb = async (displayName: string, coreIdentity: string, data: any, toastId: string, typeName: string) => {
    const isLight = typeName === '라이트'
    const finalRole = isLight ? 'comment' : (data.role || 'mixed')


    const advancedSettings = {
      coreIdentity,
      role: finalRole,
      axisTone: data.axisTone || 5,
      axisTarget: data.axisTarget || 5,
      axisVocab: data.axisVocab || 5,
      axisAttitude: data.axisAttitude || 5,
      axisAffection: data.axisAffection || 5,
      formality: data.formality || 'informal',
      catchphrases: [],
      forbiddenWords: [],
      triggerKeywords: [],
      fewShots: []
    }


    const formData = new FormData()
    formData.append('displayName', displayName)
    formData.append('username', '')
    formData.append('aiModelProvider', isLight ? 'gemma-4-26b-a4b-it' : 'gemma-4-31b-it')


    formData.append('category', data.category || 'politics')
    formData.append('botTier', '1')
    formData.append('status', 'active')
    const keywords = data.keywords || ''
    const finalPersonaPrompt = `[${displayName}] ${keywords}\n${coreIdentity}`
    formData.append('personaPrompt', finalPersonaPrompt)
    formData.append('advancedSettings', JSON.stringify(advancedSettings))

    formData.append('postPriority', '1')
    formData.append('commentPriority', '1')
    formData.append('interval', '60')
    if (data.existence_category) formData.append('existenceCategory', data.existence_category)
    if (data.existence_detail) formData.append('existenceDetail', data.existence_detail)
    if (data.realm_category) formData.append('realmCategory', data.realm_category)
    if (data.realm_detail) formData.append('realmDetail', data.realm_detail)
    if (data.speech_style) formData.append('speechStyle', data.speech_style)
    formData.append('botRole', finalRole)
    if (data.topic_keyword) formData.append('topicKeyword', data.topic_keyword)
    formData.append('botGender', data.gender || 'unknown')
    
    // NBTI 및 TAMP 축 데이터 명시적 추가
    if (data.nbtiType) formData.append('nbtiType', data.nbtiType)
    formData.append('axisProfile', JSON.stringify({
      axisTone: data.axisTone || Math.floor(Math.random() * 10) + 1,
      axisTarget: data.axisTarget || Math.floor(Math.random() * 10) + 1,
      axisVocab: data.axisVocab || Math.floor(Math.random() * 10) + 1,
      axisAttitude: data.axisAttitude || Math.floor(Math.random() * 10) + 1,
      axisAffection: data.axisAffection || Math.floor(Math.random() * 10) + 1
    }))

    await createAiBot(formData)

    toast.success(`[${typeName}] 로봇 [${displayName}] 생성 완료!`, { id: toastId })
    router.push('./robot?tab=list')
    router.refresh()

  }

  const handleToggleCron = async (newIsActive: boolean) => {
    setIsAutoBotActive(newIsActive)
    try {
      await toggleAutoBotSettings(newIsActive, autoBotTargetCount)
      toast.success(newIsActive ? '자동 생성 크론이 활성화되었습니다.' : '자동 생성 크론이 중지되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '설정 저장 실패')
      setIsAutoBotActive(!newIsActive)
    }
  }

  const handleTargetCountChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newCount = Number(e.target.value)
    if (newCount !== initialTargetCount) {
      try {
        await toggleAutoBotSettings(isAutoBotActive, newCount)
        toast.success(`로봇 목표 개수가 ${newCount}개로 저장되었습니다.`)
      } catch (e: any) {
        toast.error('설정 저장 실패')
      }
    }
  }

  const handleToggleFeedCron = async (newIsActive: boolean) => {
    setIsAutoFeedActive(newIsActive)
    try {
      await toggleAutoFeedSettings(newIsActive, autoFeedTargetCount)
      toast.success(newIsActive ? '자동 피드 크론이 활성화되었습니다.' : '자동 피드 크론이 중지되었습니다.')
    } catch (e: any) {
      toast.error(e.message || '설정 저장 실패')
      setIsAutoFeedActive(!newIsActive)
    }
  }

  const handleFeedTargetCountChange = async (e: React.FocusEvent<HTMLInputElement>) => {
    const newCount = Number(e.target.value)
    if (newCount !== initialFeedTargetCount) {
      try {
        await toggleAutoFeedSettings(isAutoFeedActive, newCount)
        toast.success(`피드 목표 개수가 ${newCount}개로 저장되었습니다.`)
      } catch (e: any) {
        toast.error('설정 저장 실패')
      }
    }
  }

  const [isPilotModalOpen, setIsPilotModalOpen] = useState(false)
  const { activeBot, isPiloting } = useActivePersona()

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      {/* 1. 수동 봇 강제생성 UI (파일럿 - 피드 - 프로봇 - 라이트봇 - 주제어입력란 순 동일 행 배치) */}
      {(mode === 'manual' || mode === 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          {/* 1) 파일럿 */}
          <button
            type="button"
            onClick={() => setIsPilotModalOpen(true)}
            className={`h-9 px-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center ${
              isPiloting
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
            }`}
          >
            {isPiloting ? activeBot?.display_name : '파일럿'}
          </button>

          {/* 2) 피드 */}
          <Link
            href="/posts/new"
            className="h-9 px-3.5 bg-black text-white hover:bg-gray-800 rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center"
          >
            피드
          </Link>

          {/* 3) 프로봇 */}
          <button 
            type="button" 
            onClick={handleProBot} 
            disabled={isLoading}
            className={`h-9 px-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center ${
              isLoading && loadingType === 'pro'
                ? 'bg-purple-700 text-white animate-pulse'
                : isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
            }`}
          >
            {isLoading && loadingType === 'pro' ? '프로 기획중...' : '프로봇'}
          </button>

          {/* 4) 라이트봇 */}
          <button 
            type="button" 
            onClick={handleGeneralBot} 
            disabled={isLoading}
            className={`h-9 px-3 text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center ${
              isLoading && loadingType === 'general'
                ? 'bg-purple-100 text-purple-700 border border-purple-300 animate-pulse'
                : isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {isLoading && loadingType === 'general' ? '라이트 생성중...' : '라이트봇'}
          </button>

          {/* 5) 주제어 입력란 */}
          <input
            type="text"
            value={topicKeyword}
            onChange={e => setTopicKeyword(e.target.value)}
            placeholder="주제어 입력"
            className="w-28 sm:w-32 h-9 px-3 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none bg-white text-gray-900"
            disabled={isLoading}
          />

          <PilotSelectorModal
            isOpen={isPilotModalOpen}
            onClose={() => setIsPilotModalOpen(false)}
            hasAdmin={true}
          />
        </div>
      )}

      {/* 2. 크론 자동생성 & 피드 버퍼링 UI */}
      {(mode === 'cron' || mode === 'all') && (
        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {/* 자동 생성 크론 UI */}
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isAutoBotActive}
                  onChange={(e) => handleToggleCron(e.target.checked)}
                  disabled={isLoading}
                />
                <div className={`block w-8 h-5 rounded-full transition-colors ${isAutoBotActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isAutoBotActive ? 'transform translate-x-3' : ''}`}></div>
              </div>
              <span className="text-xs font-bold text-gray-700">봇 자동생성</span>
            </label>

            <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                대기 {pendingBotCount}개
              </span>
              <span className="text-xs font-medium text-gray-600">/ 목표</span>
              <input
                type="number"
                value={autoBotTargetCount}
                onChange={(e) => setAutoBotTargetCount(Number(e.target.value))}
                onBlur={handleTargetCountChange}
                min="1"
                max="1000"
                className="w-14 h-6 px-1.5 text-xs text-center border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={isLoading}
              />
              <span className="text-xs text-gray-500">개</span>
            </div>
          </div>

          {/* 피드 자동 생성 크론 UI */}
          <div className="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isAutoFeedActive}
                  onChange={(e) => handleToggleFeedCron(e.target.checked)}
                  disabled={isLoading}
                />
                <div className={`block w-8 h-5 rounded-full transition-colors ${isAutoFeedActive ? 'bg-indigo-500' : 'bg-gray-300'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform ${isAutoFeedActive ? 'transform translate-x-3' : ''}`}></div>
              </div>
              <span className="text-xs font-bold text-gray-700">피드 버퍼링</span>
            </label>

            <div className="flex items-center gap-1.5 border-l border-gray-300 pl-3">
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                대기 {pendingFeedCount}개
              </span>
              <span className="text-xs font-medium text-gray-600">/ 목표</span>
              <input
                type="number"
                value={autoFeedTargetCount}
                onChange={(e) => setAutoFeedTargetCount(Number(e.target.value))}
                onBlur={handleFeedTargetCountChange}
                min="1"
                max="1000"
                className="w-14 h-6 px-1.5 text-xs text-center border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                disabled={isLoading}
              />
              <span className="text-xs text-gray-500">개</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
