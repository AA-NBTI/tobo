'use client'

import { useState } from 'react'
import { sendPasswordResetEmail } from '../actions'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()
  const t = useTranslations('Login')
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '...' : t('sendResetLink')}
    </button>
  )
}

export default function ForgotPasswordPage() {
  const t = useTranslations('Login')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function clientAction(formData: FormData) {
    setErrorMsg('')
    setSuccessMsg('')
    
    const res = await sendPasswordResetEmail(formData)
    if (res?.error) {
      setErrorMsg(res.error)
    } else if (res?.success) {
      setSuccessMsg(t('resetLinkSent'))
    }
  }

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-50 py-12 px-4">
      <div className="w-full max-w-md mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('forgotPassword')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('forgotPasswordDesc')}</p>

        <form action={clientAction} className="flex flex-col gap-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-semibold text-center">
              {successMsg}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">{t('email')}</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition" 
              placeholder={t('emailPlaceholder')} 
            />
          </div>
          
          <div className="pt-2">
            <SubmitButton />
          </div>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-black transition">
            {t('backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
