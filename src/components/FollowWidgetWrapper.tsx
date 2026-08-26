import { getRecommendedUsers } from '@/app/[locale]/users/actions'
import FollowRecommendationWidget from '@/components/FollowRecommendationWidget'

export default async function FollowWidgetWrapper({
  currentUserId,
  isMobile
}: {
  currentUserId?: string
  isMobile: boolean
}) {
  const recommendedUsers = await getRecommendedUsers(10)
  
  if (!recommendedUsers || recommendedUsers.length === 0) {
    return null
  }

  return (
    <FollowRecommendationWidget 
      users={recommendedUsers} 
      currentUserId={currentUserId} 
      isMobile={isMobile} 
    />
  )
}
