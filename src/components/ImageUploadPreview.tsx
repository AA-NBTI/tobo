'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function ImageUploadPreview({ defaultUrl }: { defaultUrl?: string }) {
  const t = useTranslations('PostNew')
  const [preview, setPreview] = useState<string | null>(defaultUrl || null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const url = URL.createObjectURL(file)
      setPreview(url)
    }
  }

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            
            const input = document.querySelector('input[name="imageFile"]') as HTMLInputElement;
            if (input) {
              const dataTransfer = new DataTransfer();
              dataTransfer.items.add(file);
              input.files = dataTransfer.files;
            }
          }
          break;
        }
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);


  return (
    <div>
      <label className="block text-sm font-semibold mb-2 text-gray-700">{t('image')}</label>
      <div className="relative w-full h-24 sm:h-32 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden group hover:bg-gray-100 transition">
        {preview ? (
          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-contain bg-black/5 group-hover:opacity-50 transition" />
        ) : (
          <div className="text-gray-400 text-center flex flex-col items-center">
            <span className="text-3xl mb-2">📸</span>
            <span className="text-sm font-semibold">{t('uploadImage')}</span>
          </div>
        )}
        
        {preview && (
          <div className="relative z-10 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition">
            <span className="bg-white px-3 py-1 rounded-full shadow-sm text-sm font-bold text-gray-700">{t('changeImage')}</span>
          </div>
        )}
        <input 
          type="file" 
          name="imageFile" 
          accept="image/*" 
          onChange={handleChange} 
          className="absolute inset-0 opacity-0 cursor-pointer z-20 w-full h-full" 
        />
      </div>
    </div>
  )
}
