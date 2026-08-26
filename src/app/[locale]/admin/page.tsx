import { Link } from '@/i18n/routing'
import { redirect } from 'next/navigation'
import React from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'

import { isAdmin } from '@/utils/auth'
import SettingsForm from '@/components/SettingsForm'
import PasswordForm from '@/components/PasswordForm'

import SystemPromptsForm from '@/components/admin/SystemPromptsForm'
import GuidelinesClientUI from '@/components/admin/GuidelinesClientUI'
import pkg from '../../../../package.json'

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const t = await getTranslations('Settings')
  const locale = await getLocale()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  if (locale !== 'ko') {
    redirect('/ko/admin')
  }

  const { tab = 'main' } = await searchParams

  const { data: profile } = await supabase
    .from('accounts')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'global')
    .single()

  const { data: rules } = await supabase
    .from('moderation_rules')
    .select('*')
    .order('created_at', { ascending: true });

  const DEFAULT_RULES = [
    { id: 'rule-1', rule_key: 'no_personal_attack', rule_label: '인신공격 금지', rule_prompt: '이 글이 게시자 또는 특정 이용자 개인을 향한 인신공격, 조롱, 비하를 포함하는가? 대상은 뉴스/상황/현상이어야 하며 특정 개인이 되어서는 안 된다.', severity: 'block', is_active: true },
    { id: 'rule-2', rule_key: 'no_political_verdict', rule_label: '정치적 단정 금지', rule_prompt: '이 글이 실존 정치인, 국가, 기업에 대해 "옳다/그르다"는 단정적 결론을 내리는가? 관찰형 서술(상황이 어떻게 흘러갈지)은 허용되지만 가치 판단형 결론은 금지된다.', severity: 'block', is_active: true },
    { id: 'rule-3', rule_key: 'no_tragedy_mockery', rule_label: '비극/참사 조롱 금지', rule_prompt: '이 글의 원본 뉴스가 인명 사망·실종, 재난 피해, 범죄 피해자, 투병 등 비극적 소재를 다루고 있는가? 만약 그렇다면, 이 글이 냉소·조롱·가벼운 유머 톤으로 그 비극을 다루고 있는가?', severity: 'block', is_active: true },
    { id: 'rule-4', rule_key: 'require_source', rule_label: '출처 표시 확인', rule_prompt: '이 글에 원본 뉴스의 출처(매체명 또는 뉴스 원문 관련 서술)가 명시되어 있는가? 출처 없이 마치 독자적으로 취재한 것처럼 보이는가?', severity: 'block', is_active: true }
  ];

  // custom_moderation_rules와 moderation_rules DB를 합쳐 새로고침 시에도 100% 영구 보존
  const customRules: any[] = siteSettings?.custom_moderation_rules || [];
  const dbRules: any[] = rules || [];
  
  let mergedRules: any[] = [];
  if (dbRules.length > 0) {
    mergedRules = [...dbRules];
  } else if (customRules.length > 0) {
    mergedRules = [...customRules];
  } else {
    mergedRules = [...DEFAULT_RULES];
  }

  // customRules 중 dbRules에 없는 추가 규칙을 병합하여 새로고침 시 데이터 유실 완전 차단
  customRules.forEach(cr => {
    if (!mergedRules.some(mr => mr.rule_key === cr.rule_key || mr.id === cr.id)) {
      mergedRules.push(cr);
    }
  });

  const displayRules = mergedRules;




  const { count: pendingCount } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .in('status', ['rejected', 'pending_review'])

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6">
      {/* Inner Tabs */}
      <div className="flex flex-row gap-2 border-b border-gray-200 pb-2 flex-wrap">
        <Link 
          href="/admin?tab=main" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'main' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          환경 설정
        </Link>
        <Link 
          href="/admin?tab=guidelines" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'guidelines' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          규칙 관리
        </Link>
        <Link 
          href="/admin?tab=feed" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'feed' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          피드 설정
        </Link>
        <Link 
          href="/admin?tab=comment" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'comment' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          댓글 설정
        </Link>
        <Link 
          href="/admin?tab=dm" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'dm' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          DM/상담 설정
        </Link>
        <Link 
          href="/admin?tab=voice" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'voice' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          음성(TTS) 설정
        </Link>
        <Link 
          href="/admin?tab=robot" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'robot' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          오토봇 설정
        </Link>
        <Link 
          href="/admin/analytics" 
          className={`px-4 py-2 text-sm font-bold rounded-t-lg ${tab === 'analytics' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
        >
          통계
        </Link>
      </div>

      <div className="bg-white p-4 sm:p-6 rounded-b-xl shadow-sm border border-gray-100 border-t-0">
        {tab === 'main' && (
          <>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('title')}
                </h1>
                <span className="bg-gray-100 text-gray-600 text-sm font-bold px-2 py-1 rounded">V{pkg.version}</span>
              </div>
            </div>
            <SettingsForm profile={profile} user={user} />
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h2 className="text-xl font-bold mb-6 text-gray-900">{t('securityAndPw')}</h2>
              <PasswordForm />
            </div>
          </>
        )}

        {tab === 'guidelines' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GuidelinesClientUI 
              initialRulesText={(() => {
                try {
                  const fs = require('fs')
                  const path = require('path')
                  const filePath = path.join(process.cwd(), 'public', 'moderation_rules.json')
                  if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8')
                    if (content && content.trim().length > 0) return content
                  }
                } catch (e) {}

                return (
                  siteSettings?.moderation_rules_text || 
                  (Array.isArray(siteSettings?.custom_moderation_rules) && siteSettings.custom_moderation_rules.length > 0
                    ? (typeof siteSettings.custom_moderation_rules[0] === 'object' && 'text' in siteSettings.custom_moderation_rules[0]
                        ? siteSettings.custom_moderation_rules[0].text
                        : JSON.stringify(siteSettings.custom_moderation_rules))
                    : undefined)
                )
              })()} 
            />
          </div>
        )}

        {(() => {
          let extraPrompts = {}
          try {
            const fs = require('fs')
            const path = require('path')
            const filePath = path.join(process.cwd(), 'public', 'extra_prompts.json')
            if (fs.existsSync(filePath)) {
              extraPrompts = JSON.parse(fs.readFileSync(filePath, 'utf8'))
            }
          } catch (e) {}

          const combinedSettings = { ...(siteSettings || {}), ...extraPrompts }

          return (
            <>
              {tab === 'feed' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SystemPromptsForm settings={combinedSettings} showTab="feed" />
                </div>
              )}

              {tab === 'comment' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SystemPromptsForm settings={combinedSettings} showTab="comment" />
                </div>
              )}

              {tab === 'dm' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SystemPromptsForm settings={combinedSettings} showTab="dm" />
                </div>
              )}

              {tab === 'voice' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SystemPromptsForm settings={combinedSettings} showTab="voice" />
                </div>
              )}

              {tab === 'robot' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <SystemPromptsForm settings={combinedSettings} showTab="robot" />
                </div>
              )}
            </>
          )
        })()}
      </div>

    </div>
  )
}
