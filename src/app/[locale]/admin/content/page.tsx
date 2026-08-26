import { createClient as createServerClient } from '@/utils/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/utils/auth';
import ReviewQueueClientUI from '@/components/admin/ReviewQueueClientUI';
import UnifiedBlogEditor from '@/components/admin/UnifiedBlogEditor';
import { Link } from '@/i18n/routing';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://missing-url',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'missing-key'
);

export default async function ContentAdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isAdmin(user)) {
    notFound();
  }

  const { tab = 'blog' } = await searchParams;

  // 1. status = 'rejected', 'pending_review', 및 최근 50개 'published' 게시글 조회
  let query = supabaseAdmin
    .from('posts')
    .select('*, accounts(display_name, avatar_url, username, post_priority)')
    .in('status', ['rejected', 'pending_review', 'pending_publish', 'published'])
    
  if (tab === 'counseling') {
    query = query.eq('category', '심리상담')
  }

  const { data: queuePosts } = await query
    .order('created_at', { ascending: false })
    .limit(50);

  const pendingCount = queuePosts?.filter(p => p.status === 'pending_review').length || 0;

  // 2. 활성화된 봇 목록 조회 (블로그 생성기 용도)
  let activeBots: any[] = [];
  if (tab === 'blog' || !tab) {
    const { data: bots } = await supabaseAdmin
      .from('accounts')
      .select('id, display_name, persona_prompt')
      .eq('is_ai', true)
      .eq('status', 'active')
      .order('display_name');
    activeBots = bots || [];
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 py-6 sm:py-8 pb-20 flex flex-col gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="mb-2">
        {/* Sub-tabs for Content Hub */}
        <div className="flex border-b border-gray-200">
          <Link
            href="/admin/content?tab=blog"
            className={`px-4 sm:px-6 py-3 text-base sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${
              (tab === 'blog' || !tab)
                ? 'border-purple-600 text-purple-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            블로그
          </Link>
          <Link
            href="/admin/content?tab=pending_publish"
            className={`px-4 sm:px-6 py-3 text-base sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'pending_publish'
                ? 'border-indigo-600 text-indigo-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            발행대기
          </Link>
          <Link
            href="/admin/content?tab=feed"
            className={`px-4 sm:px-6 py-3 text-base sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'feed' 
                ? 'border-black text-black' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            예약검토 {pendingCount > 0 && <span className="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
          </Link>
          <Link
            href="/admin/content?tab=counseling"
            className={`px-4 sm:px-6 py-3 text-base sm:text-lg font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab === 'counseling' 
                ? 'border-pink-600 text-pink-700' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            심리/연애상담 코너
          </Link>
        </div>
      </div>

      {(tab === 'blog' || !tab) && (
        <UnifiedBlogEditor bots={activeBots} mode="create" />
      )}
      
      {['pending_review', 'pending_publish', 'published', 'rejected', 'feed', 'counseling'].includes(tab) && (
        <ReviewQueueClientUI posts={queuePosts || []} initialTab={tab === 'feed' || tab === 'counseling' ? 'pending_review' : tab} />
      )}
    </div>
  );
}
