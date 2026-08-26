import React from 'react'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/utils/auth'
import SystemPromptsForm from '@/components/admin/SystemPromptsForm'

export const dynamic = 'force-dynamic'

export default async function AdminRobotSettingsPage() {
  const t = await getTranslations('Settings')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user)) {
    redirect('/')
  }

  const { data: siteSettings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'global')
    .single()

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mt-2">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">오토 로봇 프롬프트 관리</h1>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">고급 설정</span>
          </div>
        </div>
        
        <div className="prose prose-sm text-gray-500 mb-8 max-w-none">
          <p>이곳에서 오토 로봇 자동 생성 시 사용되는 프롬프트를 전역적으로 수정할 수 있습니다.</p>
        </div>

        <SystemPromptsForm settings={siteSettings || {}} />
      </div>
    </div>
  )
}
