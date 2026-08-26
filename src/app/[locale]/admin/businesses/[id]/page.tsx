import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { isAdmin } from '@/utils/auth'
import { getBusiness, createService, deleteService } from '../actions'
import ServiceManagerClient from './ServiceManagerClient'

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

      {/* 서비스 관리 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🛎 서비스 관리</h2>
        <ServiceManagerClient businessId={id} initialServices={business.services || []} />
      </div>
    </div>
  )
}
