'use client'

import React, { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Sparkles, Save, RotateCcw, Sliders } from 'lucide-react'

export default function ToboPromptConfigPage() {
  const [prompt, setPrompt] = useState('')
  const [temperature, setTemperature] = useState(0.7)
  const [isCardForced, setIsCardForced] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/tobo-prompt-config')
      const json = await res.json()
      if (json.success && json.data) {
        setPrompt(json.data.system_prompt)
        setTemperature(Number(json.data.temperature) || 0.7)
        setIsCardForced(Boolean(json.data.is_card_forced))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tobo-prompt-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_prompt: prompt,
          temperature,
          is_card_forced: isCardForced
        })
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || '저장 실패')
      }

      toast.success('✅ 토보 시스템 프롬프트 및 자율성 설정이 실시간 저장되었습니다!')
    } catch (e: any) {
      toast.error('설정 저장 실패: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 font-sans space-y-6">
      {/* 상단 헤더 */}
      <div className="bg-gray-950 text-white rounded-2xl p-6 border border-gray-800 shadow-md">
        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 mb-1.5">
          <Sparkles size={15} />
          <span>토보 AI 자율성 & 프롬프트 관제 센터</span>
        </div>
        <h1 className="text-2xl font-black text-white">토보 코어 시스템 프롬프트 관리자 설정</h1>
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">
          토보 AI(Gemma 31B)의 대화 자율성과 원칙을 관리자가 실시간으로 튜닝할 수 있습니다. 억지스러운 물음표 강제나 카드 들이밀기 없이, AI 모델이 상식적이고 유연하게 대화할 수 있도록 지침을 설정합니다.
        </p>
      </div>

      {/* 설정 폼 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* 시스템 프롬프트 텍스트 영역 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sliders size={16} className="text-blue-600" />
              <span>토보 시스템 프롬프트 (System Prompt)</span>
            </label>
            <span className="text-xs text-gray-500 font-mono">Realtime Live Injection</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={12}
            className="w-full p-4 border border-gray-300 rounded-xl text-xs font-mono leading-relaxed text-gray-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            placeholder="토보의 시스템 프롬프트를 입력하세요..."
          />
        </div>

        {/* 모델 파라미터 조절 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">대화 자율성 온도 (Temperature)</span>
              <span className="font-mono text-xs font-bold text-blue-600">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
            <p className="text-[11px] text-gray-500">높을수록 더 유연하고 사람처럼 상식적인 대화를 수행합니다. (권장: 0.7)</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-gray-800 block">선택 카드 강제 들이밀기 제한</span>
              <span className="text-[11px] text-gray-500">손님의 발화 맥락을 무시하고 카드를 억지로 띄우지 않습니다.</span>
            </div>
            <input
              type="checkbox"
              checked={!isCardForced}
              onChange={(e) => setIsCardForced(!e.target.checked)}
              className="w-5 h-5 accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 저장 버튼 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={fetchConfig}
            disabled={loading || saving}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            <RotateCcw size={14} />
            <span>원래대로 불러오기</span>
          </button>
          <button
            onClick={handleSave}
            disabled={loading || saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-md transition active:scale-98"
          >
            <Save size={14} />
            <span>{saving ? '저장 중...' : '프롬프트 설정 실시간 저장'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
