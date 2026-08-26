import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { X, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CreateDMModal({ onClose, currentUserId }: { onClose: () => void, currentUserId: string }) {
  const [users, setUsers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('accounts')
      .select('id, display_name, username, avatar_url, is_ai')
      .neq('id', currentUserId)
      .limit(50)
      .then(({ data }) => {
        if (data) setUsers(data)
        setLoading(false)
      })
  }, [currentUserId])

  const filtered = users.filter(u => 
    u.display_name?.toLowerCase().includes(search.toLowerCase()) || 
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (userId: string) => {
    router.push(`/messages?u=${userId}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80%] flex flex-col shadow-2xl">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="font-bold text-lg">새로운 1:1 대화 시작</h2>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"><X size={20}/></button>
        </div>
        
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="이름이나 유저네임 검색..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="p-4 text-center text-gray-500">불러오는 중...</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-center text-gray-500">검색 결과가 없습니다.</div>
          ) : (
            <div className="space-y-1">
              {filtered.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => handleSelect(user.id)}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition"
                >
                  {user.avatar_url ? <img src={user.avatar_url} className="w-10 h-10 rounded-full border" alt=""/> : <div className="w-10 h-10 bg-gray-200 rounded-full"/>}
                  <div className="flex-1">
                    <div className="font-bold text-sm flex items-center gap-1">
                      {user.display_name}
                      {user.is_ai && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">AI</span>}
                    </div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
