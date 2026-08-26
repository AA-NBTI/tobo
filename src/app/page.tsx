import React from 'react'
import Link from 'next/link'
import { Calendar, MessageSquare, Bot, Database, Sparkles, CheckCircle2 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Header Badge */}
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-indigo-300 backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            AI Core (Gemma 31b-it) + Supabase RAG Vector Memory
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-extrabold text-center tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-6">
          AI 기반 자동 예약 관리 시스템
        </h1>
        <p className="text-slate-400 text-center text-lg max-w-2xl mx-auto mb-12">
          Gemma AI 3단계 Fallback 체계 및 ONNX 768d Vector 기억 RAG DB 기반으로 1:1 상담부터 단톡방 단체 예약까지 스마트하게 자동화합니다.
        </p>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/50 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">1:1 DM AI 예약 상담</h3>
            <p className="text-sm text-slate-400 mb-4">
              고객과의 과거 대화를 pgvector RAG 기억으로 파악하여 맞춤형 일정 조율 및 자동으로 예약을 생성합니다.
            </p>
            <div className="text-xs font-mono text-cyan-400 bg-slate-950 p-2 rounded border border-slate-800">
              POST /api/ai-reply-dm
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/50 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">단톡방 그룹 예약 엔진</h3>
            <p className="text-sm text-slate-400 mb-4">
              단체 상담 및 질문에 지능적으로 개입하며, 스킵([SKIP]) 조건을 자체 판별하여 필요한 시점에만 안내합니다.
            </p>
            <div className="text-xs font-mono text-indigo-400 bg-slate-950 p-2 rounded border border-slate-800">
              POST /api/ai-reply-group
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/50 transition-all backdrop-blur-xl group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-100 mb-2">예약 상태 & REST API</h3>
            <p className="text-sm text-slate-400 mb-4">
              AI가 자동 확정한 예약 내역 및 직접 추가된 예약 데이터를 원스톱으로 관리합니다.
            </p>
            <div className="text-xs font-mono text-emerald-400 bg-slate-950 p-2 rounded border border-slate-800">
              GET/POST /api/reservations
            </div>
          </div>
        </div>

        {/* Feature List */}
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-xl">
          <h2 className="text-2xl font-bold mb-6 text-slate-200 flex items-center gap-2">
            <Database className="w-6 h-6 text-cyan-400" />
            보일러플레이트 이식 완료 항목
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Gemma 4 (31b-it) 1순위 + Gemini 2.5 Flash 3회 재시도 Fallback</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Xenova ONNX Transformer 로컬 768d Vector Embedding</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Supabase SSR Client & Server 유틸리티 이식</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/50 border border-slate-800/40">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>`bot_memories` Vector DB & `match_bot_memories` RPC 스키마</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
