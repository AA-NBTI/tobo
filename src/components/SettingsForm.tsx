'use client'

import { useState, useTransition } from 'react'
import { toast } from 'react-hot-toast'
import { updateProfile, updateLocaleCookie } from '@/app/[locale]/settings/actions'
import AvatarUpload from './AvatarUpload'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/routing'

import { isAdmin } from '@/utils/auth'

export default function SettingsForm({ profile, user }: { profile: any, user: any }) {
  const t = useTranslations('Settings')
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [isSaving, setIsSaving] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(profile?.cover_url || null)
  const [selectedLocale, setSelectedLocale] = useState(locale)

  const isUserAdmin = profile?.is_admin || isAdmin(user)

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setCoverPreview(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const formData = new FormData(e.currentTarget)
      await updateProfile(formData)
      toast.success(t('saveSuccess'))
      
      if (selectedLocale !== locale) {
        startTransition(() => {
          router.replace(pathname, { locale: selectedLocale })
        })
      } else {
        router.refresh()
      }
    } catch (error) {
      console.error(error)
      toast.error(t('saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
      <div>
        <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('profileImage')}</label>
        <AvatarUpload defaultUrl={profile?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}`} />
      </div>

      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 mb-1">{t('accountEmail')}</h2>
        <p className="text-gray-900 font-medium break-all">{user.email}</p>
        {profile?.is_ai && (
           <span className="inline-block mt-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">{t('aiAdmin')}</span>
        )}
      </div>

      <div>
        <label htmlFor="username" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('username')}</label>
        <div className="flex bg-gray-50 border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-black">
          <span className="px-3 py-3 text-gray-500 font-bold bg-gray-100 border-r border-gray-200 whitespace-nowrap">@</span>
          <input 
            id="username" 
            name="username" 
            type="text" 
            defaultValue={profile?.username || ''} 
            placeholder={t('usernamePlaceholder')}
            className="flex-1 min-w-0 bg-transparent p-2.5 sm:p-3 outline-none font-medium text-gray-900" 
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('displayName')}</label>
        <input 
          id="displayName" 
          name="displayName" 
          type="text" 
          defaultValue={profile?.display_name || ''} 
          required 
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('bio')}</label>
        <textarea 
          id="bio" 
          name="bio" 
          defaultValue={profile?.bio || ''} 
          rows={3}
          placeholder={t('bioPlaceholder')}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none" 
        />
      </div>

      {/* Advanced Matching Profile Fields */}
      <div className="pt-4 border-t border-gray-100 flex flex-col gap-4">
        <h3 className="text-sm font-bold text-gray-900">상세 프로필 정보 (선택사항)</h3>
        <p className="text-xs text-gray-500 mb-2">향후 맞춤형 추천 및 연결(매칭)을 위해 수집되며, 공개적으로 노출되지 않습니다.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">생년월일 (DOB)</label>
            <input type="date" name="birth_date" defaultValue={profile?.birth_date || ''} className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">연락처</label>
            <input type="tel" name="phone_number" defaultValue={profile?.phone_number || ''} placeholder="예: 010-1234-5678" className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">연락용 이메일</label>
            <input type="email" name="contact_email" defaultValue={profile?.contact_email || ''} placeholder="가입 이메일 외 추가 연락처" className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">국가 (Country)</label>
            <input type="text" name="country" defaultValue={profile?.country || ''} placeholder="예: 대한민국" className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">거주 지역 (Location)</label>
            <input type="text" name="location" defaultValue={profile?.location || ''} placeholder="예: 서울특별시 강남구" className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">성별 (Gender)</label>
            <select name="gender" defaultValue={profile?.gender || 'unknown'} className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white">
              <option value="unknown">비공개</option>
              <option value="male">남성</option>
              <option value="female">여성</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">성격 유형 (NBTI)</label>
            <select name="nbti_type" defaultValue={profile?.nbti_type || ''} className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white">
              <option value="">선택안함</option>
              {['INTJ','INTP','ENTJ','ENTP','INFJ','INFP','ENFJ','ENFP','ISTJ','ISFJ','ESTJ','ESFJ','ISTP','ISFP','ESTP','ESFP'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700">관심 카테고리</label>
            <select name="category" defaultValue={profile?.category || ''} className="w-full border border-gray-200 p-2 rounded-lg focus:ring-2 focus:ring-black outline-none bg-white">
              <option value="">선택안함</option>
              <option value="tech">IT/테크</option>
              <option value="business">비즈니스/경제</option>
              <option value="politics">정치/사회</option>
              <option value="entertainment">엔터/연예</option>
              <option value="sports">스포츠</option>
              <option value="science">과학/우주</option>
              <option value="health">건강/라이프</option>
              <option value="humor">유머/밈</option>
            </select>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('coverImage')}</label>
        <div className="relative w-full h-32 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group">
          {coverPreview && <img src={coverPreview} alt="Cover" className="absolute inset-0 w-full h-full object-cover object-center opacity-80 group-hover:opacity-40 transition" />}
          <div className="relative z-10 text-center pointer-events-none">
            <span className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-medium text-gray-700">
              {coverPreview ? t('changeImage') : t('selectImage')}
            </span>
          </div>
          <input type="file" name="coverFile" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" />
        </div>
        <p className="text-xs text-gray-500 mt-2">{t('coverHint')}</p>
      </div>

      {profile?.is_ai && (
        <div className="pt-4 border-t border-purple-100 bg-purple-50/50 p-4 rounded-xl border">
          <label className="block text-sm font-bold text-purple-900 mb-2 flex items-center gap-1">
            <span>🤖</span> 로봇 정체성 공개 노출 설정 (Layer 6)
          </label>
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                name="show_public_card" 
                defaultChecked={profile.show_public_card !== false} 
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span>공개 프로필 미니 모달 카드 활성화</span>
            </label>
            <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                name="show_nbti_badge" 
                defaultChecked={profile.show_nbti_badge !== false} 
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span>NBTI 진단 결과 배지(예: ENFP) 공개</span>
            </label>
            <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                name="show_realm_info" 
                defaultChecked={profile.show_realm_info !== false} 
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span>존재 유형 & 소속/거주지 정보 공개</span>
            </label>
            <label className="flex items-center gap-2 text-gray-700 font-medium cursor-pointer">
              <input 
                type="checkbox" 
                name="show_prompt" 
                defaultChecked={profile.show_prompt !== false} 
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
              />
              <span>페르소나 시스템 프롬프트 코드 공개</span>
            </label>
          </div>
        </div>
      )}


      {isUserAdmin && (

        <div className="pt-4 border-t border-gray-100">
          <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('siteLogo')}</label>
          <div className="flex flex-col gap-3">
            <input 
              type="file" 
              name="logoFile" 
              accept="image/*" 
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100 cursor-pointer"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
              <input type="checkbox" name="removeLogo" value="true" className="w-4 h-4 rounded text-black focus:ring-black border-gray-300" />
              <span>{t('removeLogo')}</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('logoHint')}</p>
        </div>
      )}

      <div className="pt-4 border-t border-gray-100">
        <label className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('language')}</label>
        <select 
          value={selectedLocale}
          onChange={(e) => setSelectedLocale(e.target.value)}
          disabled={isPending || isSaving}
          className="w-full border border-gray-200 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-black focus:outline-none bg-white cursor-pointer disabled:opacity-50"
        >
          <option value="en">English (US)</option>
          <option value="ko">한국어 (Korean)</option>
        </select>
      </div>

      <button type="submit" disabled={isSaving} className={`bg-black text-white font-medium py-3 rounded-lg hover:bg-gray-800 transition shadow-sm mt-1 sm:mt-2 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? t('saving') : t('save')}
      </button>
    </form>
  )
}
