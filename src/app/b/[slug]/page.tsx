import { notFound } from 'next/navigation'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import BookingPanel from './BookingPanel'
import ReviewSection from './ReviewSection'

export const dynamic = 'force-dynamic'

async function getBusinessBySlug(slug: string) {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const decodedSlug = decodeURIComponent(slug)
  
  // 1. slug로 먼저 조회
  const { data: bySlug } = await admin
    .from('businesses')
    .select('*, services(*), reviews(*)')
    .eq('slug', decodedSlug)
    .eq('is_active', true)
    .maybeSingle()

  if (bySlug) return bySlug

  // 2. id로 조회 (fallback)
  const { data: byId } = await admin
    .from('businesses')
    .select('*, services(*), reviews(*)')
    .eq('id', decodedSlug)
    .eq('is_active', true)
    .maybeSingle()

  return byId
}

const CATEGORY_LABELS: Record<string, string> = {
  beauty: '💇 미용/뷰티',
  restaurant: '🍽 음식점',
  clinic: '🏥 의원/클리닉',
  fitness: '💪 운동/피트니스',
  education: '📚 교육/강습',
  general: '🏢 기타',
}

export default async function BusinessPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const business = await getBusinessBySlug(slug)
  if (!business) notFound()

  const activeServices = (business.services || []).filter((s: any) => s.is_active)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 커버 영역 */}
      <div className="relative h-48 sm:h-64 bg-gradient-to-br from-indigo-500 to-purple-600 overflow-hidden">
        {business.cover_url && (
          <img src={business.cover_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* 업체 정보 카드 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-10 relative z-10 mb-6">
          <div className="flex items-start gap-4">
            {business.logo_url ? (
              <img src={business.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover shadow" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-indigo-100 flex items-center justify-center text-2xl shadow">
                🏢
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs text-indigo-600 font-medium mb-0.5">
                {CATEGORY_LABELS[business.category] || business.category}
              </div>
              <h1 className="text-xl font-bold text-gray-900 truncate">{business.name}</h1>
              {business.address && (
                <p className="text-sm text-gray-500 mt-0.5">📍 {business.address}</p>
              )}
              {business.phone && (
                <a href={`tel:${business.phone}`} className="text-sm text-indigo-600 hover:underline">
                  📞 {business.phone}
                </a>
              )}
            </div>
          </div>
          {business.description && (
            <p className="mt-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-4">
              {business.description}
            </p>
          )}
        </div>

        {/* 서비스 목록 + 예약 패널 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pb-16">
          {/* 서비스 목록 */}
          <div className="lg:col-span-3">
            <h2 className="text-base font-bold text-gray-800 mb-3">🛎 서비스</h2>
            {activeServices.length === 0 ? (
              <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm border border-gray-100">
                등록된 서비스가 없습니다.
              </div>
            ) : (
              <div className="space-y-3">
                {activeServices.map((s: any) => (
                  <div key={s.id} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">{s.name}</h3>
                        <div className="text-xs text-gray-500 mt-1">
                          ⏱ {s.duration_minutes}분 · 👤 최대 {s.max_party_size}명
                        </div>
                        {s.description && (
                          <p className="text-xs text-gray-400 mt-1">{s.description}</p>
                        )}
                      </div>
                      <div className="text-right ml-4 shrink-0">
                        <div className="text-base font-bold text-indigo-700">
                          {s.price === 0 ? '무료' : `${s.price.toLocaleString()}원`}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 예약 패널 */}
          <div className="lg:col-span-2">
            <h2 className="text-base font-bold text-gray-800 mb-3">📅 예약하기</h2>
            <BookingPanel business={business} services={activeServices} />
          </div>
        </div>

        {/* 방문자 리뷰 & AI 점주 답글 섹션 */}
        <ReviewSection
          businessId={business.id}
          businessName={business.name}
          initialReviews={business.reviews || []}
        />
      </div>
    </div>
  )
}
