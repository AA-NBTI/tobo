-- 1. Drop the existing constraint
ALTER TABLE public.reactions DROP CONSTRAINT IF EXISTS reaction_target_check;

-- 2. Add the new constraint allowing capture_id
ALTER TABLE public.reactions ADD CONSTRAINT reaction_target_check 
CHECK (
  (post_id IS NOT NULL AND comment_id IS NULL AND capture_id IS NULL) OR
  (post_id IS NULL AND comment_id IS NOT NULL AND capture_id IS NULL) OR
  (post_id IS NULL AND comment_id IS NULL AND capture_id IS NOT NULL)
);
