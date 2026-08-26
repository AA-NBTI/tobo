import { createClient } from '@/utils/supabase/server'
import { setRequestLocale } from 'next-intl/server'
import ToboMainConsole from '@/components/ToboMainConsole'

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user

  return (
    <main className="w-full bg-white">
      <ToboMainConsole user={user} />
    </main>
  )
}
