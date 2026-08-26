import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getBusiness } from '../actions'
import ServiceManagerClient from './ServiceManagerClient'
import PromoTriggerButton from './PromoTriggerButton'

export const dynamic = 'force-dynamic'

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user)) redirect('/')

  const { id } = await params
  const business = await getBusiness(id)
  if (!business) notFound()

  return (
    <div className="w-full max-w-4xl mx-auto p-4 py-8 pb-24">
      <div className="mb-6">
        <a href="/ko/admin/businesses" className="text-sm text-indigo-600 hover:underline">← 업체 목록</a>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
          <p className="text-gray-500 text-sm mt-1">{business.address || '주소 미등록'} · {business.phone || '번호 미등록'}</p>
        </div>
        <a
          href={`/b/${business.slug}`}
          target="_blank"
          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 transition"
        >
          공개 페이지 보기 →
        </a>
      </div>

      {/* AI 홍보 피드 생성 */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 rounded-xl p-5 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-purple-800">🤖 AI 홍보 피드 생성</h2>
            <p className="text-xs text-purple-600 mt-1">AI가 이 업체의 서비스를 분석해 SNS 홍보 게시글을 자동으로 작성합니다.</p>
          </div>
          <PromoTriggerButton businessId={id} businessName={business.name} />
        </div>
      </div>

      {/* 서비스 관리 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🛎 서비스 관리</h2>
        <ServiceManagerClient businessId={id} initialServices={business.services || []} />
      </div>
    </div>
  )
}
