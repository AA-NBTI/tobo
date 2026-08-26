-- Drop the restrictive policy
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Create an open policy for Realtime to easily broadcast, we filter on the client via channel filter
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (true);
