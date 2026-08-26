'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { updatePassword } from '@/app/[locale]/settings/actions'
import { useTranslations } from 'next-intl'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function PasswordForm() {
  const t = useTranslations('Settings')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    
    const form = e.currentTarget
    const formData = new FormData(form)
    const newPwd = formData.get('newPassword') as string
    const confirmPwd = formData.get('confirmPassword') as string

    if (newPwd !== confirmPwd) {
      setErrorMsg(t('passwordMismatch'))
      return
    }

    setIsSaving(true)
    
    try {
      const res = await updatePassword(formData)
      if (res?.error) {
        setErrorMsg(res.error)
        toast.error(res.error)
      } else {
        toast.success(t('pwSuccess'))
        form.reset() // clear the password fields
      }
    } catch (error: any) {
      console.error(error)
      setErrorMsg(error.message || t('pwFailed'))
      toast.error(t('pwFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-6">
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium text-center">
          {errorMsg}
        </div>
      )}
      <div>
        <label htmlFor="newPassword" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('newPassword')}</label>
        <div className="relative">
          <input 
            id="newPassword" 
            name="newPassword" 
            type={showNewPassword ? "text" : "password"} 
            required
            minLength={6}
            placeholder={t('newPasswordPlaceholder')}
            className="w-full border border-gray-200 p-2.5 sm:p-3 pr-10 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition" 
          />
          <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
            {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1 sm:mb-2 text-gray-700">{t('confirmPassword')}</label>
        <div className="relative">
          <input 
            id="confirmPassword" 
            name="confirmPassword" 
            type={showConfirmPassword ? "text" : "password"} 
            required
            minLength={6}
            placeholder={t('confirmPasswordPlaceholder')}
            className="w-full border border-gray-200 p-2.5 sm:p-3 pr-10 rounded-lg focus:ring-2 focus:ring-black focus:outline-none transition" 
          />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={isSaving} className={`w-full bg-gray-800 text-white font-medium py-3 rounded-lg hover:bg-gray-900 transition mt-1 sm:mt-2 shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}>
        {isSaving ? t('changing') : t('changePasswordBtn')}
      </button>
    </form>
  )
}
