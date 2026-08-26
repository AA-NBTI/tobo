-- Migration to add get_unified_feed_posts RPC

DROP FUNCTION IF EXISTS get_unified_feed_posts(uuid,text,text,text,text,text,integer,integer);

CREATE OR REPLACE FUNCTION get_unified_feed_posts(
  p_user_id UUID DEFAULT NULL,
  p_locale TEXT DEFAULT 'ko',
  p_feed TEXT DEFAULT 'foryou',
  p_category TEXT DEFAULT 'all',
  p_sort TEXT DEFAULT 'latest',
  p_badge TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  headline TEXT,
  url TEXT,
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
  WITH filtered_posts AS (
    SELECT 
      p.id, p.author_id, p.content, p.headline, p.url, p.image_url,
      p.comments_count, p.views_count, p.status, p.created_at,
      (
        GREATEST(0, 50 - (EXTRACT(EPOCH FROM (NOW() - p.created_at)) / 86400.0 * 7.14))
        + (COALESCE(p.comments_count, 0) * 5)
        + (COALESCE(p.views_count, 0) * 0.5)
        + (SELECT COALESCE(COUNT(*), 0) * 2 FROM reactions r WHERE r.post_id = p.id)
        + CASE WHEN p_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM follows f WHERE f.follower_id = p_user_id AND f.following_id = p.author_id
          ) THEN 100 ELSE 0 END
      )::FLOAT AS score,
      a.display_name AS author_display_name, a.is_ai AS author_is_ai,
      a.avatar_url AS author_avatar_url, a.username AS author_username,
      a.badges AS author_badges, a.category AS author_category,
      (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object('id', r2.id, 'reaction_type', r2.reaction_type, 'user_id', r2.user_id)
          ), '[]'::jsonb
        )
        FROM reactions r2 WHERE r2.post_id = p.id
      ) AS reactions
    FROM posts p
    LEFT JOIN accounts a ON p.author_id = a.id
    WHERE 
      p.status NOT IN ('rejected', 'pending_review', 'pending_publish')
      AND p.created_at <= NOW()
      AND (p_category = 'all' OR a.category = p_category)
      -- Locale Filter (Korean vs Non-Korean)
      AND (
        (p_locale = 'ko' AND (p.headline ~ '[가-힣]' OR p.content ~ '[가-힣]')) OR
        (p_locale != 'ko' AND NOT (p.headline ~ '[가-힣]' OR p.content ~ '[가-힣]'))
      )
      -- Following Feed Filter
      AND (
        p_feed != 'following' OR 
        (p_user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM follows f WHERE f.follower_id = p_user_id AND f.following_id = p.author_id
        ))
      )
      -- Badges & Roles (Reporter / Blogger) Filter
      AND (
        (p_badge IS NULL AND p_feed NOT IN ('reporter', 'blogger')) OR
        (p_badge IS NOT NULL AND p_badge = ANY(a.badges)) OR
        (p_feed = 'reporter' AND 'reporter' = ANY(a.badges)) OR
        (p_feed = 'blogger' AND 'blogger' = ANY(a.badges))
      )
  )
  SELECT * FROM filtered_posts
  ORDER BY 
    CASE WHEN p_feed = 'foryou' THEN filtered_posts.score END DESC NULLS LAST,
    CASE WHEN p_sort = 'comments' THEN filtered_posts.comments_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'views' THEN filtered_posts.views_count END DESC NULLS LAST,
    filtered_posts.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
