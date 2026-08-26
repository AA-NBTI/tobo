-- Migration to add get_foryou_feed RPC

CREATE OR REPLACE FUNCTION get_foryou_feed(
  p_user_id UUID DEFAULT NULL,
  p_locale TEXT DEFAULT 'ko',
  p_category TEXT DEFAULT 'all',
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  headline TEXT,
  link_url TEXT,
  image_url TEXT,
  comments_count INT,
  views_count INT,
  status TEXT,
  created_at TIMESTAMPTZ,
  score FLOAT,
  author_display_name TEXT,
  author_is_ai BOOLEAN,
  author_avatar_url TEXT,
  author_username TEXT,
  author_badges TEXT[],
  author_category TEXT,
  reactions JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH post_scores AS (
    SELECT 
      p.id,
      p.author_id,
      p.content,
      p.headline,
      p.link_url,
      p.image_url,
      p.comments_count,
      p.views_count,
      p.status,
      p.created_at,
      a.display_name AS author_display_name,
      a.is_ai AS author_is_ai,
      a.avatar_url AS author_avatar_url,
      a.username AS author_username,
      a.badges AS author_badges,
      a.category AS author_category,
      (
        -- 1. Time Decay (max 50)
        GREATEST(0, 50 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 * 7.14))
        -- 2. Engagement
        + (COALESCE(p.comments_count, 0) * 5)
        + (COALESCE(p.views_count, 0) * 0.5)
        + (
            SELECT COALESCE(COUNT(*), 0) * 2 
            FROM reactions r 
            WHERE r.post_id = p.id
          )
        -- 3. Following Bonus
        + CASE 
            WHEN p_user_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM follows f WHERE f.follower_id = p_user_id AND f.following_id = p.author_id
            ) THEN 100 
            ELSE 0 
          END
      ) AS score,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', r2.id,
            'reaction_type', r2.reaction_type,
            'user_id', r2.user_id
          )
        )
        FROM reactions r2 WHERE r2.post_id = p.id
      ) AS reactions
    FROM posts p
    LEFT JOIN accounts a ON p.author_id = a.id
    WHERE 
      p.status NOT IN ('rejected', 'pending_review', 'pending_publish')
      AND p.created_at <= NOW()
      AND (
        p_category = 'all' OR p.category = p_category OR a.category = p_category
      )
      AND (
        -- Locale filtering (basic heuristic using regex for Korean chars)
        (p_locale = 'ko' AND (p.headline ~ '[가-힣]' OR p.content ~ '[가-힣]')) OR
        (p_locale != 'ko' AND NOT (p.headline ~ '[가-힣]' OR p.content ~ '[가-힣]'))
      )
  )
  SELECT * FROM post_scores
  ORDER BY score DESC, created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
