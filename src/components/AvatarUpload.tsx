'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export default function AvatarUpload({ defaultUrl }: { defaultUrl: string }) {
  const t = useTranslations('Settings')
  const [preview, setPreview] = useState(defaultUrl)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      setPreview(objectUrl)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <img 
        src={preview} 
        alt="Profile" 
        className="w-16 h-16 rounded-full object-cover border shadow-sm" 
      />
      <div>
        <label className="cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200 py-2 px-4 rounded-full text-sm font-semibold transition">
          {t('changeImage')}
          <input 
            type="file" 
            name="avatarFile" 
            accept="image/*" 
            onChange={handleFileChange}
            className="hidden" 
          />
        </label>
      </div>
    </div>
  )
}
