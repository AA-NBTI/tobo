'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-hot-toast'
import { Volume2, Square } from 'lucide-react'

// 마크다운·특수기호·URL·HTML 제거 후 순수 읽기 텍스트 추출
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/https?:\/\/[^\s]+/g, '')       // URL 제거
    .replace(/<[^>]*>?/gm, '')                // HTML 태그 제거
    .replace(/#[\w가-힣]+/g, '')              // 해시태그 제거
    .replace(/[*_#`~>[\]()]/g, '')            // 마크다운 기호 제거
    .replace(/\[.*?\]/g, '')                  // 대괄호 내용(이모지 태그 등) 제거
    .replace(/\n/g, ' ')                      // 줄바꿈 → 공백
    .replace(/\s{2,}/g, ' ')                  // 연속 공백 정리
    .trim()
}

// 전역 재생 인스턴스 (동시 재생 방지)
let currentUtterance: SpeechSynthesisUtterance | null = null

export default function PostTTSButton({
  text,
  senderId,
  receiverId = 'all',
  variant = 'default'
}: {
  text: string
  senderId: string
  receiverId?: string
  variant?: 'default' | 'icon'
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true

    // 다른 버튼에서 stop-all-tts 이벤트 발생 시 정지
    const handleStop = () => {
      if (isMountedRef.current) setIsPlaying(false)
    }
    window.addEventListener('stop-all-tts', handleStop)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('stop-all-tts', handleStop)
    }
  }, [])

  const handlePlayTTS = () => {
    // 재생 중이면 정지
    if (isPlaying) {
      window.dispatchEvent(new Event('stop-all-tts'))
      window.speechSynthesis.cancel()
      currentUtterance = null
      setIsPlaying(false)
      return
    }

    if (!text) return

    // 브라우저 Web Speech API 지원 확인
    if (!('speechSynthesis' in window)) {
      toast.error('이 브라우저는 음성 재생을 지원하지 않습니다.')
      return
    }

    // 다른 모든 TTS 먼저 중지
    window.dispatchEvent(new Event('stop-all-tts'))
    window.speechSynthesis.cancel()

    const cleanText = cleanTextForSpeech(text)
    if (!cleanText) {
      toast.error('읽을 수 있는 텍스트가 없습니다.')
      return
    }

    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = 'ko-KR'
    utterance.rate = 1.0   // 속도 (0.1 ~ 10)
    utterance.pitch = 1.0  // 음높이 (0 ~ 2)
    utterance.volume = 1.0 // 볼륨 (0 ~ 1)

    // 한국어 음성 선택 (기기에서 사용 가능한 경우 우선 선택)
    const voices = window.speechSynthesis.getVoices()
    const koVoice = voices.find(v => v.lang.startsWith('ko'))
    if (koVoice) utterance.voice = koVoice

    utterance.onstart = () => {
      if (isMountedRef.current) setIsPlaying(true)
    }

    utterance.onend = () => {
      if (isMountedRef.current) {
        setIsPlaying(false)
        currentUtterance = null
      }
    }

    utterance.onerror = (e) => {
      // 'interrupted'는 의도적 취소이므로 무시
      if (e.error !== 'interrupted' && isMountedRef.current) {
        toast.error('음성 재생 중 오류가 발생했습니다.')
        setIsPlaying(false)
        currentUtterance = null
      }
    }

    currentUtterance = utterance
    setIsPlaying(true)
    window.speechSynthesis.speak(utterance)
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handlePlayTTS()
      }}
      className={
        variant === 'icon'
          ? `flex items-center justify-center w-6 h-6 rounded-full transition ${isPlaying ? 'bg-red-100 text-red-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`
          : `flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition ${isPlaying ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
      }
      title={isPlaying ? '중지' : '음성으로 듣기 (TTS)'}
    >
      {isPlaying ? (
        <Square size={variant === 'icon' ? 12 : 14} fill="currentColor" />
      ) : (
        <Volume2 size={variant === 'icon' ? 12 : 14} />
      )}
      {variant !== 'icon' && (isPlaying ? '중지' : '듣기')}
    </button>
  )
}
