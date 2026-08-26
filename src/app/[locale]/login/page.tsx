import { getTranslations } from 'next-intl/server'
import AuthForm from './AuthForm'

export default async function LoginPage() {
  const t = await getTranslations('Login')

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-80px)] bg-gray-50 py-12 px-4">
      <AuthForm />
    </div>
  )
}
