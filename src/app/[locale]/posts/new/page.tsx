import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { createPost } from '@/app/[locale]/posts/actions'
import ImageUploadPreview from '@/components/ImageUploadPreview'
import { getTranslations } from 'next-intl/server'
import CreatePostFormClient from '@/components/CreatePostFormClient'

export default async function NewPostPage() {
  const t = await getTranslations('PostNew')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 sm:px-4 mt-4 sm:mt-8 mb-20 flex flex-col gap-4 sm:gap-6">
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
        <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-900">{t('title')}</h1>
        <CreatePostFormClient t={{
          category: t('category'),
          headline: t('headline'),
          headlinePlaceholder: t('headlinePlaceholder'),
          content: t('content'),
          contentPlaceholder: t('contentPlaceholder'),
          sourceUrl: t('sourceUrl'),
          sourceUrlPlaceholder: t('sourceUrlPlaceholder'),
          submit: t('submit')
        }} />
      </div>
    </div>
  )
}
