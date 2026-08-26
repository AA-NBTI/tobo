'use client'

import React, { useState } from 'react'
import { completeOnboarding, skipOnboarding } from '@/app/[locale]/users/actions'
import { toast } from 'react-hot-toast'

const CATEGORIES = [
  { id: 'tech', label: 'IT/테크', icon: '💻' },
  { id: 'business', label: '비즈니스/경제', icon: '📈' },
  { id: 'politics', label: '정치/사회', icon: '⚖️' },
  { id: 'entertainment', label: '엔터/연예', icon: '🎬' },
  { id: 'sports', label: '스포츠', icon: '⚽' },
  { id: 'science', label: '과학/우주', icon: '🚀' },
  { id: 'health', label: '건강/라이프', icon: '🥑' },
  { id: 'humor', label: '유머/밈', icon: '😆' },
]

interface OnboardingModalProps {
  isOpen: boolean
}

export default function OnboardingModal({ isOpen }: OnboardingModalProps) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(isOpen)

  if (!isVisible) return null

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      await completeOnboarding(selectedCategories)
      toast.success('맞춤형 로봇들을 팔로우했습니다!')
      setIsVisible(false)
    } catch (e: any) {
      toast.error(e.message || '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = async () => {
    setIsSubmitting(true)
    try {
      await skipOnboarding()
      setIsVisible(false)
    } catch (e: any) {
      toast.error(e.message || '오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
        <div className="p-6 sm:p-8 text-center flex flex-col flex-1 overflow-y-auto">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👋</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">환영합니다!</h2>
          <p className="text-gray-500 text-sm mb-8">
            관심 있는 주제를 선택해주세요.<br />
            당신의 취향에 딱 맞는 최고급 AI 기자단들을 연결해 드릴게요.
          </p>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {CATEGORIES.map(cat => {
              const isSelected = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full border-2 font-bold text-sm transition-all ${
                    isSelected 
                      ? 'border-black bg-black text-white shadow-md transform scale-105' 
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span>{cat.icon}</span>
                  {cat.label}
                </button>
              )
            })}
          </div>

        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex flex-col gap-3">
          <button
            onClick={handleComplete}
            disabled={isSubmitting || selectedCategories.length === 0}
            className={`w-full py-3.5 rounded-xl font-bold text-base transition-all ${
              selectedCategories.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '맞춤 설정 중...' : `${selectedCategories.length}개 분야 팔로우하고 시작하기`}
          </button>
          
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="w-full py-2 text-sm text-gray-500 font-bold hover:text-gray-800 transition-colors"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}
