'use client'

import { useState } from 'react'
import { login, signup, loginWithGoogle } from './actions'
import { useTranslations } from 'next-intl'
import { useFormStatus } from 'react-dom'
import { Link } from '@/i18n/routing'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

function SubmitButton({ isLogin }: { isLogin: boolean }) {
  const { pending } = useFormStatus()
  const t = useTranslations('Login')
  
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full bg-black text-white p-3 rounded-lg font-semibold hover:bg-gray-800 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? '...' : (isLogin ? t('loginBtn') : t('signupBtn'))}
    </button>
  )
}

export default function AuthForm() {
  const t = useTranslations('Login')
  const [isLogin, setIsLogin] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  async function clientAction(formData: FormData) {
    setErrorMsg('')
    
    if (!isLogin) {
      const pwd = formData.get('password') as string
      const confirmPwd = formData.get('confirmPassword') as string
      if (pwd !== confirmPwd) {
        setErrorMsg('비밀번호가 서로 일치하지 않습니다.') // TODO: use i18n
        return
      }
      const res = await signup(formData)
      if (res?.error) setErrorMsg(res.error)
    } else {
      const res = await login(formData)
      if (res?.error) setErrorMsg(res.error)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
      <div className="flex border-b border-gray-100">
        <button 
          type="button"
          onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          className={`flex-1 py-4 text-center font-semibold text-sm transition ${isLogin ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {t('loginBtn')}
        </button>
        <button 
          type="button"
          onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          className={`flex-1 py-4 text-center font-semibold text-sm transition ${!isLogin ? 'text-black border-b-2 border-black' : 'text-gray-400 hover:text-gray-600'}`}
        >
          {t('signupBtn')}
        </button>
      </div>

      <div className="p-8">
        <form action={clientAction} className="flex flex-col gap-5">
          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-semibold text-center">
              {errorMsg}
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">{t('email')}</label>
            <input id="email" name="email" type="email" required className="border border-gray-200 p-3 rounded-lg focus:ring-2 focus:ring-black outline-none transition" placeholder={t('emailPlaceholder')} />
          </div>
          
          <div className="flex flex-col gap-2 relative">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700">{t('password')}</label>
            <div className="relative">
              <input id="password" name="password" type={showPassword ? "text" : "password"} required className="w-full border border-gray-200 p-3 pr-10 rounded-lg focus:ring-2 focus:ring-black outline-none transition" placeholder={t('passwordPlaceholder')} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="flex flex-col gap-2 relative">
              <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">비밀번호 확인</label>
              <div className="relative">
                <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} required className="w-full border border-gray-200 p-3 pr-10 rounded-lg focus:ring-2 focus:ring-black outline-none transition" placeholder="비밀번호를 한번 더 입력해주세요" />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none">
                  {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>
          )}
          
          <div className="pt-2 flex flex-col gap-4">
            <SubmitButton isLogin={isLogin} />
            {isLogin && (
              <div className="text-center">
                <Link href="/login/forgot" className="text-sm font-bold text-gray-500 hover:text-black hover:underline transition">
                  {t('forgotPassword')}
                </Link>
              </div>
            )}
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-400 font-medium">또는</span>
          </div>
        </div>

        <form>
          <button formAction={loginWithGoogle} formNoValidate className="w-full flex justify-center items-center gap-3 border border-gray-200 text-gray-700 font-semibold p-3 rounded-lg hover:bg-gray-50 transition shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('googleBtn')}
          </button>
        </form>
      </div>
    </div>
  )
}
