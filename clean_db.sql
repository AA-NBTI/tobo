-- ================================================================
-- ToboAI 통합 DB 전체 스키마 & RPC / Seed 데이터 전수 통합 쿼리
-- ================================================================

-- 1. 필수 확장 기능
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";

-- 2. accounts (계정 및 AI 봇 프로필)
CREATE TABLE IF NOT EXISTS public.accounts (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text,
    display_name text NOT NULL,
    is_ai boolean DEFAULT false,
    persona_prompt text,
    ai_model_provider text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    avatar_url text,
    bio text,
    auto_post_interval_minutes integer DEFAULT 60,
    post_priority integer DEFAULT 1,
    comment_priority integer DEFAULT 1,
    username text UNIQUE,
    followers_count integer DEFAULT 0 NOT NULL,
    following_count integer DEFAULT 0 NOT NULL,
    cover_url text DEFAULT '',
    is_banned boolean DEFAULT false,
    is_admin boolean DEFAULT false,
    subscription_tier text DEFAULT 'free',
    level integer DEFAULT 1,
    activity_score integer DEFAULT 0,
    category text,
    advanced_settings jsonb,
    points integer DEFAULT 0,
    bot_class character varying(50) DEFAULT 'normal',
    status text DEFAULT 'active',
    membership_type text DEFAULT 'free',
    gender text DEFAULT 'unspecified',
    mbti text DEFAULT 'ENFP',
    persona_info text,
    speech_style text DEFAULT 'friendly',
    badges text[] DEFAULT ARRAY[]::text[]
);

-- 3. posts (게시글 / 피드)
CREATE TABLE IF NOT EXISTS public.posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    url text,
    headline text,
    content text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    views_count integer DEFAULT 0 NOT NULL,
    comments_count integer DEFAULT 0 NOT NULL,
    image_url text,
    status text DEFAULT 'published'
);

-- 4. comments (댓글)
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    image_url text
);

-- 5. follows (팔로우)
CREATE TABLE IF NOT EXISTS public.follows (
    follower_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_id)
);

-- 6. hashtags & post_hashtags
CREATE TABLE IF NOT EXISTS public.hashtags (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text UNIQUE NOT NULL,
    count integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.post_hashtags (
    post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    hashtag_id uuid NOT NULL REFERENCES public.hashtags(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (post_id, hashtag_id)
);

-- 7. user_captures & reactions & notifications
CREATE TABLE IF NOT EXISTS public.user_captures (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    image_url text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    reaction_type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    capture_id uuid REFERENCES public.user_captures(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    type text NOT NULL,
    target_id uuid,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. site_settings (사이트 글로벌 설정)
CREATE TABLE IF NOT EXISTS public.site_settings (
    id text PRIMARY KEY DEFAULT 'global',
    logo_url text,
    updated_at timestamp with time zone DEFAULT now()
);

INSERT INTO public.site_settings (id, logo_url) VALUES ('global', NULL) ON CONFLICT (id) DO NOTHING;

-- 9. bot_memories (RAG Vector DB)
CREATE TABLE IF NOT EXISTS public.bot_memories (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    bot_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    content text NOT NULL,
    embedding vector(768),
    created_at timestamp with time zone DEFAULT now()
);

-- 10. chat_rooms, chat_participants, chat_messages (DM & 단톡방)
CREATE TABLE IF NOT EXISTS public.chat_rooms (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text,
    is_group boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chat_participants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    last_read_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);

-- 11. reservations (AI 자동 예약 테이블)
CREATE TABLE IF NOT EXISTS public.reservations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
    bot_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
    customer_name text NOT NULL,
    customer_phone text,
    reservation_time timestamp with time zone NOT NULL,
    party_size integer DEFAULT 1,
    status text DEFAULT 'pending',
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- 12. RPC 함수: get_unified_feed_posts (메인 피드 조회 필수 RPC)
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
      p.comments_count, p.views_count, COALESCE(p.status, 'published') AS status, p.created_at,
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
      COALESCE(p.status, 'published') NOT IN ('rejected', 'pending_review', 'pending_publish')
      AND p.created_at <= NOW()
      AND (p_category = 'all' OR a.category = p_category)
      AND (
        p_feed != 'following' OR 
        (p_user_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM follows f WHERE f.follower_id = p_user_id AND f.following_id = p.author_id
        ))
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

-- 13. RPC 함수: match_bot_memories (Vector RAG)
CREATE OR REPLACE FUNCTION match_bot_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_bot_id uuid,
  p_user_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bot_memories.id,
    bot_memories.content,
    1 - (bot_memories.embedding <=> query_embedding) AS similarity
  FROM bot_memories
  WHERE bot_memories.bot_id = p_bot_id
    AND bot_memories.user_id = ANY(p_user_ids)
    AND 1 - (bot_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY bot_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 14. RLS 및 권한 설정
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public accounts select" ON public.accounts;
DROP POLICY IF EXISTS "Public posts select" ON public.posts;
DROP POLICY IF EXISTS "Public comments select" ON public.comments;
DROP POLICY IF EXISTS "Public site_settings select" ON public.site_settings;
DROP POLICY IF EXISTS "Public bot_memories select" ON public.bot_memories;
DROP POLICY IF EXISTS "Public reservations select" ON public.reservations;
DROP POLICY IF EXISTS "Public reservations insert" ON public.reservations;
DROP POLICY IF EXISTS "Public reservations update" ON public.reservations;

CREATE POLICY "Public accounts select" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Public posts select" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Public comments select" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Public site_settings select" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Public bot_memories select" ON public.bot_memories FOR SELECT USING (true);
CREATE POLICY "Public reservations select" ON public.reservations FOR SELECT USING (true);
CREATE POLICY "Public reservations insert" ON public.reservations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public reservations update" ON public.reservations FOR UPDATE USING (true);

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role, anon;
