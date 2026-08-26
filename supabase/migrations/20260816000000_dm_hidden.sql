-- Supabase SQL Editor에서 실행해주세요.

-- 1. 대화 숨김(나가기) 테이블 생성
CREATE TABLE IF NOT EXISTS direct_messages_hidden (
    user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    other_user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    hidden_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, other_user_id)
);

-- RLS 정책 설정 (사용자는 본인의 숨김 기록만 볼 수 있고 관리할 수 있음)
ALTER TABLE direct_messages_hidden ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own hidden conversations" ON direct_messages_hidden
    FOR ALL USING (auth.uid() = user_id);

-- 2. 대화 목록(Conversations) 가져오기 RPC 수정
-- 숨김 처리된 대화는 숨김 시간(hidden_at) 이후에 새로운 메시지가 오면 다시 보이게 하거나, 완전히 숨길 수 있습니다.
-- 카카오톡 방식: 숨김 시간 이후 새 메시지가 도착하면 다시 목록에 나타남.
CREATE OR REPLACE FUNCTION get_conversations(p_user_id UUID)
RETURNS TABLE (
    other_user_id UUID,
    last_message TEXT,
    last_created_at TIMESTAMP WITH TIME ZONE,
    unread_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH all_messages AS (
        SELECT 
            CASE WHEN sender_id = p_user_id THEN receiver_id ELSE sender_id END as other_id,
            content,
            created_at,
            is_read,
            receiver_id,
            ROW_NUMBER() OVER(PARTITION BY CASE WHEN sender_id = p_user_id THEN receiver_id ELSE sender_id END ORDER BY created_at DESC) as rn
        FROM direct_messages dm
        LEFT JOIN direct_messages_hidden h 
               ON h.user_id = p_user_id 
              AND h.other_user_id = (CASE WHEN dm.sender_id = p_user_id THEN dm.receiver_id ELSE dm.sender_id END)
        WHERE (dm.sender_id = p_user_id OR dm.receiver_id = p_user_id)
          -- 숨김 처리(hidden_at) 이후에 작성된 메시지만 유효함
          -- 숨김 처리가 없으면 전부 유효함
          AND (h.hidden_at IS NULL OR dm.created_at > h.hidden_at)
    )
    SELECT 
        other_id,
        MAX(CASE WHEN rn = 1 THEN content END) as last_message,
        MAX(CASE WHEN rn = 1 THEN created_at END) as last_created_at,
        COUNT(CASE WHEN receiver_id = p_user_id AND is_read = false THEN 1 END) as unread_count
    FROM all_messages
    -- 메시지가 1개 이상 남아있는(숨김 이후의) 대화만
    WHERE rn = 1
    GROUP BY other_id
    ORDER BY last_created_at DESC;
END;
$$ LANGUAGE plpgsql;
