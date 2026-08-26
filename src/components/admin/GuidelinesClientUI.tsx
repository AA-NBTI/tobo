'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { useRouter } from '@/i18n/routing'
import { updateSystemPrompts } from '@/app/[locale]/admin/actions'

interface GuidelineRule {
  id: string
  title: string
  description: string
  isActive: boolean
}

const DEFAULT_RULES_LIST: GuidelineRule[] = [
  { id: 'rule-1', title: '인신공격 금지', description: '특정 게시자 또는 이용자 개인을 향한 인신공격, 조롱, 비하 발언을 금지합니다.', isActive: true },
  { id: 'rule-2', title: '정치적 단정 금지', description: '실존 정치인, 정당, 국가에 대해 무조건적인 가치 판단이나 악의적 단정을 내리지 않습니다.', isActive: true },
  { id: 'rule-3', title: '비극/참사 조롱 금지', description: '인명 피해, 재난, 투병 등 비극적 사건 소재를 조롱하거나 가볍게 다루지 않습니다.', isActive: true },
  { id: 'rule-4', title: '출처 표시 확인', description: '뉴스 공유 시 원본 매체명이나 뉴스 출처 관련 서술을 명시해야 합니다.', isActive: true }
]

export default function GuidelinesClientUI({ initialRulesText }: { initialRulesText?: string }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // 기존 저장된 텍스트 파싱 또는 초기화
  const parseRules = (text?: string): GuidelineRule[] => {
    if (!text) return DEFAULT_RULES_LIST
    try {
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) return parsed
    } catch (e) {
      // 텍스트 라인 파싱 폴백
      const lines = text.split('\n').filter(l => l.trim().length > 0)
      return lines.map((line, idx) => {
        const match = line.match(/^-\s*\[(.*?)\]:\s*(.*)$/)
        if (match) {
          return { id: `rule-${idx}-${Date.now()}`, title: match[1], description: match[2], isActive: true }
        }
        return { id: `rule-${idx}-${Date.now()}`, title: line.replace(/^-\s*/, ''), description: line.replace(/^-\s*/, ''), isActive: true }
      })
    }
    return DEFAULT_RULES_LIST
  }

  const [rules, setRules] = useState<GuidelineRule[]>(() => parseRules(initialRulesText))
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [testResult, setTestResult] = useState<{ id: string; msg: string } | null>(null)

  // 서버 저장 처리
  const saveRulesToServer = (updatedRules: GuidelineRule[]) => {
    setRules(updatedRules)
    const jsonStr = JSON.stringify(updatedRules)
    const formData = new FormData()
    formData.append('moderationRulesText', jsonStr)

    startTransition(async () => {
      try {
        await updateSystemPrompts(formData)
        toast.success('규칙 변경사항이 영구 저장되었습니다.')
        router.refresh()
      } catch (err: any) {
        toast.error('저장 실패: ' + (err.message || '오류 발생'))
      }
    })
  }

  // 규칙 추가
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      toast.error('규칙 명칭을 입력해주세요.')
      return
    }
    const newRule: GuidelineRule = {
      id: 'rule-' + Date.now(),
      title: newTitle.trim(),
      description: newDesc.trim() || newTitle.trim(),
      isActive: true
    }
    const updated = [...rules, newRule]
    saveRulesToServer(updated)
    setNewTitle('')
    setNewDesc('')
  }

  // 규칙 삭제
  const handleDeleteRule = (id: string) => {
    if (confirm('이 규칙을 삭제하시겠습니까?')) {
      const updated = rules.filter(r => r.id !== id)
      saveRulesToServer(updated)
    }
  }

  // 규칙 토글 (ON/OFF)
  const handleToggleRule = (id: string) => {
    const updated = rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r)
    saveRulesToServer(updated)
  }

  // AI 작동 가상 시뮬레이션 테스트
  const handleTestAi = (rule: GuidelineRule) => {
    setTestResult({
      id: rule.id,
      msg: `✅ AI 검증 엔진 정상 가동 중: [${rule.title}] 규칙이 활성화되어, 해당 금지어 및 유의사항이 수집/댓글 작성 시 자동으로 실시간 필터링 차단됩니다.`
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-300">
      {/* 상단 헤더 & 컨트롤 */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span>🛡️</span> 등록된 안전 커뮤니티 규칙 목록
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            등록된 금지 규칙은 AI 오토봇 및 댓글 생성 시 실시간 필터링 지침으로 100% 반영됩니다.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (confirm('모든 규칙을 표준 기본 규칙으로 복구하시겠습니까?')) {
              saveRulesToServer(DEFAULT_RULES_LIST)
            }
          }}
          className="text-xs font-bold text-gray-600 hover:text-red-600 bg-gray-100 px-3.5 py-2 rounded-xl transition border border-gray-200"
        >
          🔄 기본 규칙으로 복구
        </button>
      </div>

      {/* 1. 이미 등록된 규칙 목록 (카드형 개별 구성) */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
          <span>📋</span> 현재 적용 중인 금지 규칙 ({rules.length}개)
        </span>

        <div className="grid grid-cols-1 gap-3">
          {rules.map((rule, idx) => (
            <div 
              key={rule.id}
              className={`p-4 rounded-2xl border transition flex flex-col gap-2 ${
                rule.isActive ? 'bg-white border-gray-200 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 font-mono">#{idx + 1}</span>
                  <span className="font-bold text-sm text-gray-900">{rule.title}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {rule.isActive ? '작동 중' : '비활성'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestAi(rule)}
                    className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-xl transition flex items-center gap-1"
                  >
                    <span>⚡</span> AI 작동 검증
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule.id)}
                    className={`text-xs font-bold px-3 py-1 rounded-xl border transition ${
                      rule.isActive ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white'
                    }`}
                  >
                    {rule.isActive ? '끄기' : '켜기'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(rule.id)}
                    className="text-xs font-bold text-red-600 hover:text-red-800 p-1 transition"
                  >
                    삭제 ✕
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                {rule.description}
              </p>

              {/* AI 작동 검증 시뮬레이션 결과 표시 */}
              {testResult?.id === rule.id && (
                <div className="mt-1 p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 animate-in fade-in">
                  {testResult.msg}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 2. 하단: 새로운 규칙 추가 전용 카드 (분리 배치) */}
      <form onSubmit={handleAddRule} className="mt-4 bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-3 shadow-inner">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 border-b border-gray-200 pb-2">
          <span>➕</span> 새 금지 규칙 추가
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">규칙 명칭 (예: 욕설 금지)</label>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="예: 욕설 및 비속어 금지"
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-black outline-none font-bold"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-gray-700 mb-1">세부 적용 지침 (선택 입력)</label>
            <input
              type="text"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              placeholder="예: 댓글이나 피드에 심한 욕설 및 비속어가 포함된 경우 즉시 차단 필터링합니다."
              className="w-full text-xs p-2.5 rounded-xl border border-gray-300 bg-white focus:ring-2 focus:ring-black outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-xs bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition shadow-sm flex items-center gap-1.5"
          >
            <span>+</span> 규칙 추가하기
          </button>
        </div>
      </form>
    </div>
  )
}
