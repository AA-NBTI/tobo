'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from '@/i18n/routing'
import { toast } from 'react-hot-toast'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import AiImageInjectButton from '@/components/admin/AiImageInjectButton'
import { useActivePersona } from '@/context/ActivePersonaContext'

interface Bot {
  id: string
  display_name: string
  persona_prompt: string
}

interface UnifiedBlogEditorProps {
  bots: Bot[]
  mode: 'create' | 'edit'
  initialData?: any
}

interface SuggestionResponse {
  keywords: string[]
  titles: {
    title: string
    coreKeyword: string
    mediumKeyword: string
    blueOceanKeyword: string
    score: number
  }[]
}

export default function UnifiedBlogEditor({ bots, mode, initialData }: UnifiedBlogEditorProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)

  const { activeBot } = useActivePersona()
  
  // AI 추천 폼 관련 상태
  const [selectedBotId, setSelectedBotId] = useState<string>(activeBot?.id || bots[0]?.id || '')

  // activeBot이 변경될 때 selectedBotId 동기화
  useEffect(() => {
    if (activeBot?.id) {
      setSelectedBotId(activeBot.id)
    }
  }, [activeBot])
  const [keyword, setKeyword] = useState('')
  
  // 추천 결과 상태
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<SuggestionResponse | null>(null)
  
  // 선택된 전략 키워드 상태
  const [coreKeyword, setCoreKeyword] = useState('')
  const [mediumKeyword, setMediumKeyword] = useState('')
  const [blueOceanKeyword, setBlueOceanKeyword] = useState('')

  // 에디터 폼 상태 (수동/자동 생성 공통)
  const [headline, setHeadline] = useState(initialData?.headline || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [linkTitle, setLinkTitle] = useState(initialData?.link_title || '')
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)

  // 1. 키워드 추천 요청
  const handleSuggest = async () => {
    if (!keyword) return toast.error('타겟 키워드를 입력하세요')
    setIsSuggesting(true)
    const toastId = toast.loading('연관 키워드 및 제목 구성 분석 중...')
    
    try {
      const res = await fetch('/api/ai-blog-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword })
      })
      if (!res.ok) throw new Error('추천 API 호출 실패')
      const data = await res.json()
      setSuggestions(data)
      toast.success('분석 완료!', { id: toastId })
    } catch (e: any) {
      toast.error('분석 실패: ' + e.message, { id: toastId })
    } finally {
      setIsSuggesting(false)
    }
  }

  // 2. AI 블로그 본문 자동 생성
  const handleGenerate = async () => {
    if (!keyword) return toast.error('키워드를 먼저 확정하세요')
    if (!selectedBotId) return toast.error('작성할 봇을 선택하세요')
    
    setIsGenerating(true)
    const toastId = toast.loading('전략 키워드를 바탕으로 고품질 블로그를 작성하고 있습니다... (약 1~2분 소요)')
    
    try {
      const res = await fetch('/api/ai-handmade-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          botId: selectedBotId, 
          keyword,
          coreKeyword,
          mediumKeyword,
          blueOceanKeyword
        })
      })

      if (!res.ok) throw new Error('API 호출 실패')
      
      const reader = res.body?.getReader()
      if (!reader) throw new Error('스트림 읽기 실패')
      
      const decoder = new TextDecoder()
      let generatedContent = ''
      
      setHeadline(keyword) // 제목에 키워드/추천제목 미리 덮어쓰기
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        generatedContent += decoder.decode(value, { stream: true })
        setContent(generatedContent)
      }

      toast.success('본문 작성이 완료되었습니다! 아래에서 수정 및 썸네일을 추가하세요.', { id: toastId })
    } catch (e: any) {
      toast.error('생성 실패: ' + e.message, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  // 3. SEO 점수 계산
  const seoScores = useMemo(() => {
    if (!content) return null
    let score = 100
    const reasons = []

    if (content.length < 500) { score -= 20; reasons.push('본문 길이 부족 (<500자)') }
    else if (content.length > 1500) { score += 10; reasons.push('풍부한 본문 길이 (가산점)') }

    if (!content.includes('#')) { score -= 10; reasons.push('해시태그(#) 부재') }
    
    const h2Count = (content.match(/^## /gm) || []).length
    if (h2Count < 2) { score -= 15; reasons.push('H2 부제목 부족 (<2개)') }

    // 전략적 키워드 사용 여부
    if (coreKeyword && !content.includes(coreKeyword)) { score -= 10; reasons.push('핵심 키워드 미사용') }
    if (mediumKeyword && !content.includes(mediumKeyword)) { score -= 5; reasons.push('중간 키워드 미사용') }
    if (blueOceanKeyword && !content.includes(blueOceanKeyword)) { score -= 5; reasons.push('틈새 키워드 미사용') }

    const mdImageCount = (content.match(/!\[.*?\]\(.*?\)/g) || []).length
    const placeholderCount = (content.match(/\[이미지:.*?\]/g) || []).length
    if (mdImageCount + placeholderCount === 0) {
      score -= 10; reasons.push('본문 내 이미지(또는 삽입 대기) 없음')
    }

    return { score: Math.max(0, Math.min(100, score)), reasons }
  }, [content, coreKeyword, mediumKeyword, blueOceanKeyword])

  // 4. 폼 제출 (발행/저장)
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!content) return toast.error('본문 내용을 작성해주세요.')

    const formData = new FormData(e.currentTarget)
    
    // 수동으로 업데이트된 텍스트에리어와 헤드라인 값 반영 보장
    formData.set('content', content)
    formData.set('headline', headline)
    
    setIsPublishing(true)
    const toastId = toast.loading(mode === 'create' ? '블로그 발행 중...' : '포스트 업데이트 중...')

    try {
      if (mode === 'create') {
        const { publishSeoBlog } = await import('@/app/[locale]/admin/content/actions')
        // publishSeoBlog에 formData 전달
        await publishSeoBlog(selectedBotId, formData)
        
        toast.success('발행 완료! 포스트가 저장되었습니다.', { id: toastId })
        router.push('/admin/content?tab=pending_publish')
      } else {
        const { updatePost } = await import('@/app/[locale]/posts/actions')
        // formData.set('status', initialData?.status || 'pending_publish') // 상태 유지 원할 시 주석 해제
        await updatePost(initialData.id, formData)
        
        toast.success('포스트가 성공적으로 수정되었습니다.', { id: toastId })
        router.push(`/posts/${initialData.id}`)
      }
    } catch (error: any) {
      if (error.message === 'NEXT_REDIRECT' || error.digest?.includes('NEXT_REDIRECT')) {
        throw error // Re-throw to allow Next.js to perform the redirect!
      }
      toast.error('오류 발생: ' + error.message, { id: toastId })
    } finally {
      setIsPublishing(false)
    }
  }

  // 5. 삭제 (수정 모드일 때만 동작)
  const handleDelete = async () => {
    if (!confirm('정말 이 포스트를 삭제하시겠습니까?')) return
    const toastId = toast.loading('삭제 중...')
    try {
      const { deletePost } = await import('@/app/[locale]/posts/actions')
      await deletePost(initialData.id, 'ko') // 임시 로케일 하드코딩 주의
      toast.success('포스트가 삭제되었습니다.', { id: toastId })
    } catch (e: any) {
      toast.error('삭제 실패: ' + e.message, { id: toastId })
    }
  }

  return (
    <div className={mode === 'edit' ? "bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100" : ""}>
      
      {/* ========================================================= */}
      {/* 1. AI 모듈 영역 (기획 및 양산) */}
      {/* ========================================================= */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 sm:p-6 rounded-xl border border-purple-100 shadow-sm mb-8">
        <h2 className="text-lg font-black text-purple-900 mb-4 flex items-center gap-2">
          <span>🤖 AI 블로그 기획 / 양산소</span>
          {mode === 'edit' && <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">수정 화면에서 재작성 가능</span>}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">초기 타겟 키워드 (또는 주제)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSuggest()}
                placeholder="예: 오사카 3박4일 코스"
                className="flex-1 border border-purple-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              />
              <button
                type="button"
                onClick={handleSuggest}
                disabled={isSuggesting || !keyword}
                className="bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 font-bold px-4 py-2.5 rounded-lg transition disabled:opacity-50 whitespace-nowrap shadow-sm text-sm"
              >
                {isSuggesting ? '분석 중...' : '💡 AI 전략 추천'}
              </button>
            </div>
          </div>

          {suggestions && suggestions.titles && (
            <div className="p-4 bg-white rounded-lg border border-purple-100 shadow-sm text-sm mt-2 animate-in fade-in slide-in-from-top-2">
              <span className="font-black text-gray-800 text-xs block mb-3">🔥 추천 제목 및 전략 키워드 세트 (클릭하여 에디터 셋팅)</span>
              <div className="flex flex-col gap-2.5">
                {suggestions.titles.map((t, i) => (
                  <button 
                    key={i}
                    type="button"
                    onClick={() => {
                      setKeyword(t.title)
                      setHeadline(t.title)
                      setCoreKeyword(t.coreKeyword)
                      setMediumKeyword(t.mediumKeyword)
                      setBlueOceanKeyword(t.blueOceanKeyword)
                      setLinkTitle(`${t.coreKeyword}, ${t.mediumKeyword}, ${t.blueOceanKeyword}`)
                      toast.success('전략 키워드가 셋팅되었습니다! 이제 블로그를 작성하세요.')
                    }} 
                    className="text-left bg-gray-50 border border-gray-200 p-3 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-gray-900 leading-tight">{t.title}</span>
                      <span className="shrink-0 text-[10px] bg-purple-100 text-purple-800 font-black px-2 py-0.5 rounded-full ring-1 ring-purple-200 shadow-xs">점수: {t.score}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-md border border-red-100 font-bold">핵심: {t.coreKeyword}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 font-bold">중간: {t.mediumKeyword}</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">틈새: {t.blueOceanKeyword}</span>
                    </div>
                  </button>
                ))}
              </div>

              {coreKeyword && (
                <div className="mt-4 pt-4 border-t border-purple-100 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">최종 제목 (수정 가능)</label>
                    <input type="text" value={keyword} onChange={e => {setKeyword(e.target.value); setHeadline(e.target.value);}} className="w-full border border-purple-200 rounded p-2 text-sm font-bold" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-red-700 mb-1">핵심 키워드</label>
                      <input type="text" value={coreKeyword} onChange={e => setCoreKeyword(e.target.value)} className="w-full border border-red-200 rounded p-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-blue-700 mb-1">중간 키워드</label>
                      <input type="text" value={mediumKeyword} onChange={e => setMediumKeyword(e.target.value)} className="w-full border border-blue-200 rounded p-1.5 text-xs" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-700 mb-1">틈새 키워드</label>
                      <input type="text" value={blueOceanKeyword} onChange={e => setBlueOceanKeyword(e.target.value)} className="w-full border border-emerald-200 rounded p-1.5 text-xs" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating || !keyword}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-3 px-4 rounded-lg transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <span className="animate-pulse">📝 고품질 블로그 생성 중... (1~2분 소요)</span>
                    ) : (
                      <span>🚀 선택한 키워드로 100점짜리 AI 블로그 생성하기</span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. 에디터 폼 영역 (수정 화면 기반) */}
      {/* ========================================================= */}
      {mode === 'edit' && <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">피드 수정</h1>}
      
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
        <div>
          <label htmlFor="headline" className="block text-sm font-bold mb-1.5 text-gray-700">
            제목 (Headline)
          </label>
          <input
            type="text"
            id="headline"
            name="headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            required
            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm font-bold shadow-sm"
            placeholder="블로그 제목을 적어주세요 (AI 생성 시 자동 기입됨)"
          />
        </div>

        <div>
          <label htmlFor="link_title" className="block text-sm font-bold mb-1.5 text-gray-700">
            링크 타이틀 / 타겟 키워드
          </label>
          <input
            type="text"
            id="link_title"
            name="link_title"
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm shadow-sm bg-gray-50 text-gray-600"
            placeholder="해시태그나 연관 키워드 (선택사항)"
          />
        </div>

        <div className="flex-grow flex flex-col relative group">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="content" className="block text-sm font-bold text-gray-700">
              본문 내용 (수동 편집 가능)
            </label>
            {/* AI 이미지 삽입 컴포넌트 부활! */}
            <AiImageInjectButton targetId="content" onInject={setContent} />
          </div>
          <textarea
            id="content"
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            required
            className="w-full border border-gray-300 p-4 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm sm:text-base resize-y min-h-[400px] shadow-sm leading-relaxed font-mono"
            placeholder="여기에 직접 내용을 작성하거나, 위젯을 통해 AI 블로그를 자동 생성하세요..."
          ></textarea>
        </div>

        {/* 3. SEO 점수판 */}
        {content && seoScores && (
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="font-black text-gray-800">📊 실시간 SEO / GEO 최적화 진단</span>
              <span className={`font-black text-lg ${seoScores.score >= 80 ? 'text-emerald-600' : seoScores.score >= 60 ? 'text-orange-500' : 'text-red-500'}`}>
                {seoScores.score}점
              </span>
            </div>
            
            {/* Schema Markup 준비 여부 체크 */}
            <div className="mb-3 text-xs flex items-center gap-1.5">
              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">✓ JSON-LD</span>
              <span className="text-gray-600 font-medium">검색엔진 인용(Citation)을 위한 Schema.org 마크업 자동 삽입 준비 완료</span>
            </div>

            {seoScores.reasons.length > 0 && (
              <ul className="text-xs text-gray-600 space-y-1 mt-2 border-t border-gray-200 pt-2">
                {seoScores.reasons.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="category" className="block text-sm font-bold mb-1.5 text-gray-700">
              카테고리 (선택)
            </label>
            <select
              id="category"
              name="category"
              defaultValue={initialData?.category || 'free'}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none bg-white font-medium text-sm text-gray-700 shadow-sm"
            >
              <option value="free">자유/일상 (Free)</option>
              <option value="politics">정치 (Politics)</option>
              <option value="economy">경제 (Economy)</option>
              <option value="society">사회 (Society)</option>
              <option value="tech">IT/기술 (Tech)</option>
              <option value="world">세계 (World)</option>
              <option value="culture">문화 (Culture)</option>
              <option value="sports">스포츠 (Sports)</option>
              <option value="opinion">오피니언 (Opinion)</option>
            </select>
          </div>

          <div>
            <label htmlFor="url" className="block text-sm font-bold mb-1.5 text-gray-700">
              원문 링크 (선택)
            </label>
            <input
              type="url"
              id="url"
              name="url"
              defaultValue={initialData?.url || ''}
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm shadow-sm"
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-1.5 text-gray-700">
            대표 썸네일 이미지 (선택)
          </label>
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
            <ImageUploadPreview 
              defaultUrl={initialData?.image_url} 
            />
            <div className="mt-4">
              <label htmlFor="imageUrl" className="block text-xs font-bold mb-1 text-gray-600">
                또는 외부 이미지 URL 직접 입력
              </label>
              <input
                type="url"
                id="image_url"
                name="image_url"
                defaultValue={initialData?.image_url || ''}
                className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-black focus:border-black outline-none text-sm shadow-sm"
                placeholder="https://..."
              />
            </div>
            <p className="text-xs text-gray-500 mt-3 font-medium">정방형(1:1) 이미지를 권장합니다. 직접 업로드 혹은 URL을 입력하세요. 미입력 시 AI가 자동 검색합니다.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-200 flex justify-between gap-4">
          {mode === 'edit' ? (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="bg-red-50 text-red-600 font-bold py-3 px-6 rounded-xl hover:bg-red-100 transition shadow-sm text-sm"
              >
                삭제하기
              </button>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <a href={`/posts/${initialData.id}`} className="px-5 py-3 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition text-sm">
                  취소
                </a>
                <button
                  type="submit"
                  disabled={isPublishing}
                  className="bg-black text-white font-bold py-3 px-8 rounded-xl hover:bg-gray-800 transition shadow-md text-sm disabled:opacity-50"
                >
                  {isPublishing ? '처리 중...' : '수정 완료'}
                </button>
              </div>
            </>
          ) : (
            <button
              type="submit"
              disabled={isPublishing}
              className="w-full bg-black text-white font-black py-4 px-4 rounded-xl hover:bg-gray-800 transition shadow-lg text-base disabled:opacity-50"
            >
              {isPublishing ? '발행 중...' : '발행'}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
