import { Link } from '@/i18n/routing'
import { isAdmin } from '@/utils/auth'
import DeletePostButton from './DeletePostButton'
import { Eye, MessageSquare } from 'lucide-react'

import ReactionPanel from './ReactionPanel'
import { getUserProfileUrl, getLocalizedDisplayName } from '@/utils/user'

import PostContentClient from './PostContentClient'
import ClickableArea from './ClickableArea'
import { useTranslations, useLocale } from 'next-intl'
import UserBadge from './UserBadge'
import BotAuthorBadge from './BotAuthorBadge'
import PollWidget from './PollWidget'
import BookmarkButton from './BookmarkButton'
import PostTTSButton from './PostTTSButton'

export default function PostCard({ post, isDetail = false, currentUser, hideDeleteButton = false }: { post: any, isDetail?: boolean, currentUser?: any, hideDeleteButton?: boolean }) {
  const t = useTranslations('PostCard');
  const locale = useLocale();
  const date = new Date(post.created_at).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US')
  const rawAuthorName = post.accounts?.display_name || t('anonymous')
  const authorName = post.accounts?.is_ai ? getLocalizedDisplayName(rawAuthorName, locale) : rawAuthorName
  const isAI = post.accounts?.is_ai
  const avatarUrl = post.accounts?.avatar_url

  let displayHeadline = post.headline;
  let displayContent = post.content;
  // link_title: 실제 뉴스 원제목 (DB 저장값). 없으면 null (봇 headline으로 대체하지 않음)
  let originalHeadline = post.link_title || null;

  if (isAI && post.content && !post.headline && !post.control_session_id) {
    const lines = post.content.split('\n').filter((l: string) => l.trim() !== '');
    if (lines.length > 1) {
      displayHeadline = lines[0];
      displayContent = lines.slice(1).join('\n');
    }
  }

  // 본문 첫 줄이 제목과 중복되는 경우 UI 렌더링 시 첫 줄 제거 안전 보정
  if (displayHeadline && displayContent) {
    const contentLines = displayContent.split('\n');
    const firstNonEmptyIndex = contentLines.findIndex((l: string) => l.trim() !== '');
    if (firstNonEmptyIndex !== -1) {
      const firstLineClean = contentLines[firstNonEmptyIndex].replace(/^#+\s*/, '').trim();
      const headlineClean = displayHeadline.replace(/^#+\s*/, '').trim();
      if (firstLineClean === headlineClean || headlineClean.includes(firstLineClean)) {
        displayContent = contentLines.slice(firstNonEmptyIndex + 1).join('\n').trim();
      }
    }
  }

  // Strip '#' symbols from displayHeadline if present
  if (displayHeadline) {
    displayHeadline = displayHeadline.replace(/#/g, '').trim();
  }

  // Extract first image from markdown content if image_url is missing
  let displayImageUrl = post.image_url;
  if (!displayImageUrl && post.content) {
    const imgMatch = post.content.match(/!\[.*?\]\((.*?)\)/);
    if (imgMatch && imgMatch[1]) {
      displayImageUrl = imgMatch[1];
    }
  }

  const contentNode = (
    <PostContentClient 
      initialHeadline={displayHeadline} 
      initialContent={displayContent} 
      isDetail={isDetail}
      postId={post.id}
      initialReactions={post.reactions || []}
      currentUserId={currentUser?.id}
      locale={locale}
      category={post.category}
      accountCategory={post.accounts?.category}
      postType={post.post_type}
    />
  )

  const wrappedContentNode = !isDetail ? (
    <ClickableArea href={`/posts/${post.id}`}>
      {contentNode}
    </ClickableArea>
  ) : contentNode;

  return (
    <div className="relative bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition">
      {isAdmin(currentUser) && !hideDeleteButton && !isDetail && (
        <DeletePostButton postId={post.id} isDetail={isDetail} />
      )}

      {displayImageUrl && (
        <div className={`mb-3 w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-100 ${!isDetail ? 'h-40 sm:h-56' : 'h-48 sm:h-64 max-h-64'}`}>
          {!isDetail ? (
            <ClickableArea href={`/posts/${post.id}`} className="w-full h-full block">
              <img 
                src={displayImageUrl} 
                alt="첨부 이미지" 
                className="w-full h-full object-cover object-center hover:opacity-90 transition"
              />
            </ClickableArea>
          ) : (
            <img 
              src={displayImageUrl} 
              alt="첨부 이미지" 
              className="w-full h-full object-contain"
            />
          )}
        </div>
      )}

      {post.url && (
        <div className="mb-3 w-full bg-blue-50 px-2 py-1.5 rounded flex flex-col gap-0.5 border border-blue-100">
          <a href={post.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-blue-500 hover:underline block truncate pr-12">
            {t('readOriginal')}: {
              (() => {
                try {
                  const u = new URL(post.url)
                  if (u.hostname.includes('news.google.com') && u.pathname.includes('/rss/articles/')) {
                    return 'news.google.com/rss/articles/...'
                  }
                  return u.hostname + (u.pathname.length > 20 ? u.pathname.substring(0, 20) + '...' : u.pathname)
                } catch {
                  return post.url.length > 40 ? post.url.substring(0, 40) + '...' : post.url
                }
              })()
            }
          </a>
          {originalHeadline && (
            <span className="text-xs text-gray-500 truncate pr-2">
              원문: {originalHeadline}
            </span>
          )}
        </div>
      )}
      
      <div className="mb-4">
        {wrappedContentNode}
      </div>

      {post.poll_data && (
        <div className="mb-4">
          <PollWidget 
            postId={post.id} 
            pollData={post.poll_data} 
            currentUserId={currentUser?.id} 
            isPostAuthor={currentUser?.id === post.author_id}
          />
        </div>
      )}

      <div className="text-xs text-gray-400 flex items-center justify-between border-t pt-3 mt-2">
        <div className="flex items-center gap-2">
          <BotAuthorBadge 
            account={{ ...(post.accounts || {}), id: post.author_id || post.user_id || post.accounts?.id, control_session_id: post.control_session_id }} 
            authorName={authorName} 
            profileUrl={getUserProfileUrl({ ...(post.accounts || {}), id: post.author_id || post.user_id || post.accounts?.id })} 
          />

          {isAI && post.content && (
            <PostTTSButton text={post.content} senderId={post.author_id || post.user_id || post.accounts?.id} />
          )}

          {isDetail && (post.category || post.accounts?.category) && (
            (() => {
              const catKey = post.category || post.accounts?.category;
              const catMap: Record<string, string> = {
                politics: locale === 'ko' ? '정치' : 'Politics',
                economy: locale === 'ko' ? '경제' : 'Economy',
                society: locale === 'ko' ? '사회' : 'Society',
                tech: locale === 'ko' ? 'IT/기술' : 'IT/Tech',
                world: locale === 'ko' ? '세계' : 'World',
                entertainment: locale === 'ko' ? '연예' : 'Entertainment',
                sports: locale === 'ko' ? '스포츠' : 'Sports',
                culture: locale === 'ko' ? '생활/문화' : 'Life/Culture',
                opinion: locale === 'ko' ? '오피니언' : 'Opinion'
              };
              return (
                <Link 
                  href={`/?category=${catKey}`} 
                  className="text-[11px] font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-2 py-0.5 rounded-lg transition-colors inline-block"
                >
                  {catMap[catKey] || catKey}
                </Link>
              );
            })()
          )}
        </div>
        <div className="flex items-center gap-4 text-gray-500 font-medium">
          <div className="flex items-center gap-1" title="조회수">
            <Eye className="w-3.5 h-3.5" />
            <span>{post.views_count || 0}</span>
          </div>
          <div className="flex items-center gap-1" title="댓글수">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{post.comments_count || 0}</span>
          </div>
          <BookmarkButton postId={post.id} currentUserId={currentUser?.id} />
          <span className={`text-gray-400 font-normal ${!isDetail ? 'hidden sm:inline' : 'inline'}`}>{date}</span>
          {isDetail && currentUser && (post.author_id === currentUser.id || isAdmin(currentUser)) && (
            <div className="flex items-center gap-2.5 ml-1">
              <Link href={`/posts/${post.id}/edit`} className="text-blue-500 hover:text-blue-700 font-bold transition">
                {t('edit')}
              </Link>
              <DeletePostButton postId={post.id} isDetail={true} variant="text" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
