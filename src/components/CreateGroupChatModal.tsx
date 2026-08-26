'use client'

import { useState } from 'react'
import { createGroupChat } from '@/app/[locale]/messages/actions'
import { useRouter } from '@/i18n/routing'
import { toast } from 'react-hot-toast'
import { X, Search } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export default function CreateGroupChatModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedUsers, setSelectedUsers] = useState<any[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value
    setSearchTerm(term)

    if (term.length < 2) {
      setSearchResults([])
      return
    }

    const { data } = await supabase
      .from('accounts')
      .select('id, display_name, username, avatar_url, is_ai')
      .or(`display_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(10)

    if (data) {
      setSearchResults(data.filter(u => !selectedUsers.find(s => s.id === u.id)))
    }
  }

  const toggleUser = (user: any) => {
    if (selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers(prev => prev.filter(u => u.id !== user.id))
    } else {
      setSelectedUsers(prev => [...prev, user])
      setSearchTerm('')
      setSearchResults([])
    }
  }

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      toast.error('대화 상대를 한 명 이상 선택해주세요.')
      return
    }

    setIsCreating(true)
    try {
      const participantIds = selectedUsers.map(u => u.id)
      const roomId = await createGroupChat(name, participantIds)
      toast.success('그룹 채팅방이 생성되었습니다.')
      onClose()
      // 그룹방 URL로 이동
      router.push(`/messages?group=${roomId}`)
    } catch (e: any) {
      toast.error(e.message || '방 생성에 실패했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl flex flex-col max-h-[80vh]">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold text-lg">새 그룹 채팅</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">방 이름 (선택)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="예: 독서 모임 방"
              className="w-full px-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">초대할 사람 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="이름이나 아이디로 검색..."
                className="w-full pl-10 pr-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="border rounded-xl max-h-40 overflow-y-auto shadow-inner bg-gray-50">
              {searchResults.map(user => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition border-b last:border-b-0 text-left"
                >
                  <img src={user.avatar_url || 'https://via.placeholder.com/40'} className="w-8 h-8 rounded-full border" />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{user.display_name}</div>
                    <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">선택된 참여자 ({selectedUsers.length})</label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map(user => (
                  <div key={user.id} className="flex items-center gap-1.5 bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-sm font-medium">
                    <img src={user.avatar_url || 'https://via.placeholder.com/20'} className="w-5 h-5 rounded-full" />
                    <span className="max-w-[100px] truncate">{user.display_name}</span>
                    <button onClick={() => toggleUser(user)} className="ml-1 hover:text-blue-500">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-2 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition">
            취소
          </button>
          <button
            onClick={handleCreate}
            disabled={selectedUsers.length === 0 || isCreating}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isCreating ? '생성 중...' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}
