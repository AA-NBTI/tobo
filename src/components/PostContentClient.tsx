'use client'

import React, { useState } from 'react'
import { Link } from '@/i18n/routing'
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export default function PostContentClient({ 
  initialHeadline, 
  initialContent,
  isDetail,
  postId,
  initialReactions,
  currentUserId,
  locale,
  category,
  accountCategory,
  postType
}: { 
  initialHeadline: string, 
  initialContent: string,
  isDetail: boolean,
  postId: string,
  initialReactions: any[],
  currentUserId?: string,
  locale?: string,
  category?: string,
  accountCategory?: string,
  postType?: string
}) {
  const [headline, setHeadline] = useState(initialHeadline)
  const [content, setContent] = useState(initialContent)

  const isMarkdown = content.includes('\n## ') || content.includes('**') || content.includes('\n- ');

  const renderWithHashtags = (text: string, isHashtagLine: boolean = false) => {
    if (!text) return null;
    const parts = text.split(/(#[\w가-힣-]+)/g);
    const rendered = parts.map((part, i) => {
      if (part.startsWith('#')) {
        const tag = part.slice(1);
        return (
          <Link 
            key={i} 
            href={`/tags/${encodeURIComponent(tag)}`} 
            className="text-blue-600 hover:underline inline-block mr-1.5 font-medium" 
            onClick={e => e.stopPropagation()}
          >
            {part}
          </Link>
        );
      }
      return part;
    });

    if (isHashtagLine) {
      return (
        <div className="flex flex-nowrap overflow-hidden text-ellipsis whitespace-nowrap gap-1">
          {rendered}
        </div>
      )
    }

    return rendered;
  }

  const contentParagraphs = content.split('\n')
  const bodyParagraphs = contentParagraphs.slice(0, -1)
  const lastParagraph = contentParagraphs[contentParagraphs.length - 1] || ''
  const isHashtagLastLine = lastParagraph.includes('#')

  return (
    <div className="mt-1">
      <div>
        <h2 className={`text-[20px] font-bold text-gray-900 leading-tight break-words text-justify flex flex-wrap items-center gap-2 ${!isDetail ? 'mb-2 hover:text-blue-600 transition' : 'mb-6'}`}>
          {postType === 'column' && (
            <span className="inline-block text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
              칼럼
            </span>
          )}
          {postType === 'blog' && (
            <span className="inline-block text-xs font-bold text-gray-700 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
              블로그
            </span>
          )}
          <span>{renderWithHashtags(headline)}</span>
        </h2>
        {isMarkdown ? (
          <div className={`text-gray-800 break-words ${!isDetail ? 'line-clamp-3' : ''}`}>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({node, ...props}) => <img className="max-w-full h-auto rounded-xl my-4 mx-auto max-h-[500px] object-contain" {...props} />,
                h1: ({node, ...props}) => <h1 className="text-2xl sm:text-3xl font-black mt-8 mb-4 leading-snug" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-xl sm:text-2xl font-bold mt-8 mb-4 leading-snug" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg sm:text-xl font-bold mt-6 mb-3" {...props} />,
                p: ({node, children, ...props}) => {
                  return <p className="mb-5 leading-[1.8] text-[15px] sm:text-[16px] break-words" {...props}>
                    {React.Children.map(children, child => {
                      if (typeof child === 'string') return renderWithHashtags(child);
                      return child;
                    })}
                  </p>
                },
                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-5 space-y-1.5" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-5 space-y-1.5" {...props} />,
                li: ({node, children, ...props}) => <li className="leading-relaxed break-words" {...props}>
                  {React.Children.map(children, child => {
                    if (typeof child === 'string') return renderWithHashtags(child);
                    return child;
                  })}
                </li>,
                a: ({node, ...props}) => <a className="text-blue-600 hover:underline font-medium break-all" {...props} />,
                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-5 text-gray-600" {...props} />,
                strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        ) : (
          <div className={`text-gray-700 text-[16px] leading-relaxed text-justify break-all ${!isDetail ? 'line-clamp-2 hover:text-gray-900' : ''}`}>
            {!isDetail ? (
              renderWithHashtags(content)
            ) : (
              <>
                {contentParagraphs.map((p, i) => (
                  <p key={i} className="mb-4 break-words">{renderWithHashtags(p)}</p>
                ))}
              </>
            )}
          </div>
        )}
      </div>
      
      <ReactionPanel 
        targetType="post" 
        targetId={postId} 
        initialReactions={initialReactions} 
        currentUser={{ id: currentUserId }}
      />
    </div>
  )
}
