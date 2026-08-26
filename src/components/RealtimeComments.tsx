'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { toPng } from 'html-to-image'
import { Link, useRouter } from '@/i18n/routing'
import { deleteComment, updateComment } from '@/app/[locale]/posts/actions'
import { ADMIN_EMAIL } from '@/utils/auth'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'react-hot-toast'
import ReactionPanel from './ReactionPanel'
import { saveBotCaptures } from '@/app/reactions/actions'
import { CheckSquare, Camera, MessageSquare } from 'lucide-react'
import UserBadge from './UserBadge'
import BotAuthorBadge from './BotAuthorBadge'
import { getUserProfileUrl, getLocalizedDisplayName } from '@/utils/user'
export default function RealtimeComments({ postId, initialComments, currentUser }: { postId: string, initialComments: any[], currentUser: any }) {
    const router = useRouter()
    const locale = useLocale()
    const supabase = createClient()
    const [comments, setComments] = useState(initialComments)
    const [deletedCommentIds, setDeletedCommentIds] = useState<string[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [zoomedImage, setZoomedImage] = useState<string | null>(null)
    const [isSelectMode, setIsSelectMode] = useState(false)
    const [selectedCommentIds, setSelectedCommentIds] = useState<string[]>([])
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editContent, setEditContent] = useState('')
    const [isSubmittingEdit, setIsSubmittingEdit] = useState(false)

    // 중복 제거 및 삭제된 댓글 필터링 후 정렬
    const mergeComments = (prev: any[], next: any[], deletedIds: string[] = deletedCommentIds) => {
        const all = [...prev, ...next].filter(c => !deletedIds.includes(c.id))
        const unique = Array.from(new Map(all.map(c => [c.id, c])).values())
        return unique.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    }

    // 서버 액션(사용자 댓글 작성 등)으로 전달된 최신 initialComments와 
    // Realtime으로 먼저 들어온 comments를 병합하여 누락이나 덮어쓰기 방지
    useEffect(() => {
        setComments(current => mergeComments(current, initialComments, deletedCommentIds))
    }, [initialComments, deletedCommentIds])

    const toggleSelection = (id: string) => {
        setSelectedCommentIds(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const isAdmin = currentUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()

    const canDelete = (comment: any) => {
        if (!currentUser) return false
        return isAdmin || comment.author_id === currentUser.id
    }

    const handleDelete = async (commentId: string) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return
        setDeletingId(commentId)
        try {
            await deleteComment(commentId, postId)
            setDeletedCommentIds(prev => [...prev, commentId])
            setComments(prev => prev.filter(c => c.id !== commentId))
            toast.success('댓글이 삭제되었습니다.')
        } catch (e) {
            toast.error('삭제에 실패했습니다.')
        } finally {
            setDeletingId(null)
        }
    }

    const startEdit = (comment: any) => {
        setEditingId(comment.id)
        setEditContent(comment.content)
    }

    const handleEditSubmit = async (commentId: string) => {
        if (!editContent.trim()) {
            toast.error('내용을 입력해주세요.')
            return
        }
        setIsSubmittingEdit(true)
        try {
            await updateComment(commentId, editContent)
            setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editContent } : c))
            toast.success('댓글이 수정되었습니다.')
            setEditingId(null)
        } catch (e) {
            toast.error('수정에 실패했습니다.')
        } finally {
            setIsSubmittingEdit(false)
        }
    }

    const handleCapture = async (mode: 'all' | 'dialogue' | 'selected') => {
        const container = document.getElementById('comments-container')
        if (!container) return

        const loadingToast = toast.loading('이미지 생성 중...')
        try {
            const className = mode === 'all' ? 'capture-mode-all' : 
                              mode === 'selected' ? 'capture-mode-selected' : 'capture-mode-dialogue'
            container.classList.add(className)

            // 구글 번역기 등에서 주입한 크로스 오리진 스타일시트 접근 시 에러 방지
            const disabledSheets: CSSStyleSheet[] = [];
            Array.from(document.styleSheets).forEach(sheet => {
                try {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const rules = sheet.cssRules;
                } catch (e: any) {
                    // SecurityError 등 모든 접근 거부 에러 발생 시 무조건 비활성화
                    sheet.disabled = true;
                    disabledSheets.push(sheet);
                }
            });

            // DOM 렌더링 대기
            await new Promise(resolve => setTimeout(resolve, 150))

            const dataUrl = await toPng(container, {
                backgroundColor: '#ffffff',
                pixelRatio: 2,
                skipFonts: true, // 크로스 오리진 웹 폰트/스타일시트 스캔 생략 (보안 에러 원천 차단)
            })

            // 원래대로 복구
            disabledSheets.forEach(sheet => {
                sheet.disabled = false;
            });

            container.classList.remove(className)

            try {
                const res = await fetch(dataUrl)
                const blob = await res.blob()
                await navigator.clipboard.write([
                    new ClipboardItem({ 'image/png': blob })
                ])

                // 자동 저장 로직 (로그인된 사용자만)
                if (currentUser) {
                    const fileExt = 'png'
                    const fileName = `capture-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`
                    
                    const { error: uploadError } = await supabase.storage
                        .from('captures')
                        .upload(fileName, blob)
                    
                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('captures')
                            .getPublicUrl(fileName)
                            
                        let capturedBots: string[] = []
                        if (mode === 'selected') {
                            capturedBots = comments
                                .filter((c: any) => selectedCommentIds.includes(c.id) && c.accounts?.is_ai)
                                .map((c: any) => c.author_id)
                        } else {
                            capturedBots = comments
                                .filter((c: any) => c.accounts?.is_ai)
                                .map((c: any) => c.author_id)
                        }
                        
                        const uniqueBots = Array.from(new Set(capturedBots)).filter(id => id !== currentUser.id)

                        // 1. 유저 본인의 캡처는 클라이언트에서 저장 (RLS 통과)
                        const { error: insertErr } = await supabase.from('user_captures').insert({
                            user_id: currentUser.id,
                            image_url: publicUrl,
                            post_id: postId
                        })
                        if (insertErr) console.error('Capture insert error:', insertErr)
                            
                        // 2. 봇들의 캡처는 서버 액션(Admin 권한)으로 우회 저장
                        if (uniqueBots.length > 0) {
                            try {
                                await saveBotCaptures(uniqueBots, publicUrl, postId)
                            } catch (e) {
                                console.error('Failed to save for bots:', e)
                            }
                        }
                    } else {
                        console.error('Capture upload error:', uploadError)
                    }
                }

                toast.dismiss(loadingToast)
                toast.success('클립보드에 복사되었습니다! (Ctrl+V)')
            } catch (clipErr) {
                const link = document.createElement('a')
                link.download = `nogoodnews-comments-${Date.now()}.png`
                link.href = dataUrl
                link.click()
                toast.dismiss(loadingToast)
                toast.success('이미지가 다운로드되었습니다.')
            }

            // 캡처 성공 후 선택 모드 해제
            setIsSelectMode(false)
            setSelectedCommentIds([])
        } catch (e: any) {
            console.error(e)
            toast.dismiss(loadingToast)
            toast.error('캡처에 실패했습니다.')
            container.classList.remove('capture-mode-all', 'capture-mode-dialogue')
        }
    }

    useEffect(() => {
        const channel = supabase
            .channel(`realtime-comments-${postId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`
                },
                async (payload) => {
                    const { data: newComment } = await supabase
                        .from('comments')
                        .select('*, accounts(display_name, is_ai, avatar_url, username, level, activity_score, badges, role)')
                        .eq('id', payload.new.id)
                        .single()

                    if (newComment) {
                        setComments((current) => mergeComments(current, [newComment]))
                        // A안 + B안 하이브리드: 
                        // B안(Realtime)으로 화면을 0.1초만에 즉각 업데이트 한 뒤,
                        // A안(router.refresh)으로 서버 캐시를 백그라운드에서 강제로 한 번 더 덮어씌워 유실을 100% 방지함.
                        router.refresh()
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'comments',
                    filter: `post_id=eq.${postId}`
                },
                (payload) => {
                    setComments(prev => prev.filter(c => c.id !== payload.old.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [postId])

    return (
        <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    댓글 <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">{comments.length}</span>
                </h3>
                {comments.length > 0 && (
                    <div className="flex flex-wrap items-center justify-end self-end gap-1.5 w-full sm:w-auto">
                        {isSelectMode ? (
                            <>
                                <button onClick={() => {setIsSelectMode(false); setSelectedCommentIds([]);}} className="whitespace-nowrap text-[11px] sm:text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-1.5 px-3 rounded-lg transition">
                                    취소
                                </button>
                                <button 
                                    onClick={() => handleCapture('selected')} 
                                    disabled={selectedCommentIds.length === 0}
                                    className="whitespace-nowrap text-[11px] sm:text-xs bg-black hover:bg-gray-800 text-white font-bold py-1.5 px-3 rounded-lg transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                                >
                                    <Camera className="w-3.5 h-3.5" /> {selectedCommentIds.length}개 캡처하기
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={() => setIsSelectMode(true)} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <CheckSquare className="w-3.5 h-3.5" /> 선택박제
                                </button>
                                <button onClick={() => handleCapture('all')} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <Camera className="w-3.5 h-3.5" /> 전체박제
                                </button>
                                <button onClick={() => handleCapture('dialogue')} className="whitespace-nowrap text-[11px] sm:text-xs bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold py-1.5 px-2.5 sm:px-3 rounded-lg transition flex items-center gap-1 shadow-sm">
                                    <MessageSquare className="w-3.5 h-3.5" /> 대화박제
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            <div id="comments-container" className={`bg-white transition-all duration-300 ${isSelectMode ? 'p-2 sm:p-4 rounded-xl border border-gray-200' : ''}`}>
                <div className="flex flex-col gap-2">
                {comments.map((comment: any, index: number) => (
                    <div 
                        key={`${comment.id}-${index}`}
                        className={`pb-3 border-b last:border-b-0 border-gray-100 comment-item ${isSelectMode && !selectedCommentIds.includes(comment.id) ? 'not-selected-for-capture opacity-50' : ''}`}
                        onClick={() => isSelectMode && toggleSelection(comment.id)}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <BotAuthorBadge
                                account={{ ...(comment.accounts || {}), id: comment.author_id || comment.user_id || comment.accounts?.id }}
                                authorName={
                                    comment.accounts?.is_ai
                                        ? getLocalizedDisplayName(comment.accounts?.display_name || '익명', locale)
                                        : (comment.accounts?.display_name || '익명')
                                }
                                profileUrl={getUserProfileUrl({ ...(comment.accounts || {}), id: comment.author_id || comment.user_id || comment.accounts?.id })}
                                showBadge={false}
                            />




                            <span className="text-xs text-gray-400 ml-auto flex items-center gap-3">
                                <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                                {isSelectMode && (
                                    <div className="checkbox-wrapper flex items-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedCommentIds.includes(comment.id)}
                                            readOnly
                                            className="w-4 h-4 text-black bg-gray-100 border-gray-300 rounded focus:ring-black focus:ring-2 cursor-pointer"
                                        />
                                    </div>
                                )}
                            </span>

                            {canDelete(comment) && (
                                <>
                                    <button
                                        onClick={() => startEdit(comment)}
                                        className="text-xs text-gray-400 hover:text-blue-500 transition ml-2"
                                    >
                                        수정
                                    </button>
                                    <button
                                        onClick={() => handleDelete(comment.id)}
                                        disabled={deletingId === comment.id}
                                        className="delete-btn text-xs text-gray-400 hover:text-red-500 transition ml-2 disabled:opacity-40"
                                    >
                                        {deletingId === comment.id ? '삭제 중...' : '삭제'}
                                    </button>
                                </>
                            )}
                        </div>
                        {editingId === comment.id ? (
                            <div className="mt-2">
                                <textarea
                                    value={editContent}
                                    onChange={e => setEditContent(e.target.value)}
                                    className="w-full border rounded p-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black"
                                    rows={3}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                    <button
                                        onClick={() => setEditingId(null)}
                                        className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        취소
                                    </button>
                                    <button
                                        onClick={() => handleEditSubmit(comment.id)}
                                        disabled={isSubmittingEdit}
                                        className="px-3 py-1 text-xs bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
                                    >
                                        {isSubmittingEdit ? '저장 중...' : '저장'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="comment-text text-gray-700 whitespace-pre-wrap text-[16px] leading-relaxed text-justify">{comment.content}</p>
                        )}
                        
                        {comment.image_url && (
                            <div className="mt-3 mb-2 rounded-lg overflow-hidden border border-gray-100 max-w-sm inline-block">
                                <img 
                                    src={comment.image_url} 
                                    alt="첨부된 짤방" 
                                    className="w-full h-auto max-h-60 object-contain bg-gray-50 cursor-zoom-in" 
                                    loading="lazy" 
                                    onClick={() => setZoomedImage(comment.image_url)}
                                />
                            </div>
                        )}

                        <div className="mt-1 reaction-panel">
                            <ReactionPanel 
                                targetType="comment" 
                                targetId={comment.id} 
                                initialReactions={comment.reactions || []} 
                                currentUser={currentUser} 
                            />
                        </div>
                    </div>
                ))}
                </div>
                {comments.length === 0 && (
                    <p className="text-gray-500 text-center py-8 text-sm">아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요!</p>
                )}
            </div>

            {zoomedImage && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4 cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full object-contain" />
                    <button className="absolute top-4 right-4 text-white text-3xl font-bold">&times;</button>
                </div>
            )}
        </>
    )
}