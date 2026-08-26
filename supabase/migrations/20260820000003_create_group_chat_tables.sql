-- 1. Create new tables
CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    is_group BOOLEAN DEFAULT false,
    admin_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS chat_participants (
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    hidden_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- 3. RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_room_participant(room_uuid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM chat_participants WHERE room_id = room_uuid AND user_id = auth.uid());
$$;

DROP POLICY IF EXISTS "Users can view their rooms" ON chat_rooms;
CREATE POLICY "Users can view their rooms" ON chat_rooms FOR SELECT USING (is_room_participant(id));

DROP POLICY IF EXISTS "Users can view participants in their rooms" ON chat_participants;
CREATE POLICY "Users can view participants in their rooms" ON chat_participants FOR SELECT USING (is_room_participant(room_id));

DROP POLICY IF EXISTS "Users can update their own participation" ON chat_participants;
CREATE POLICY "Users can update their own participation" ON chat_participants FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view messages in their rooms" ON chat_messages;
CREATE POLICY "Users can view messages in their rooms" ON chat_messages
    FOR SELECT USING (EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.room_id = chat_messages.room_id AND chat_participants.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert messages" ON chat_messages;
CREATE POLICY "Users can insert messages" ON chat_messages
    FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM chat_participants WHERE chat_participants.room_id = chat_messages.room_id AND chat_participants.user_id = auth.uid()));

GRANT ALL ON TABLE chat_rooms TO anon, authenticated, service_role;
GRANT ALL ON TABLE chat_participants TO anon, authenticated, service_role;
GRANT ALL ON TABLE chat_messages TO anon, authenticated, service_role;

-- 4. Realtime
DO $do$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_rooms') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_rooms; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_participants') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_participants; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages; END IF;
END $do$;

-- 5. Data Migration from direct_messages (if it exists)
DO $do$ DECLARE pair RECORD; v_room_id UUID; v_user1 UUID; v_user2 UUID;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'direct_messages') THEN
        FOR pair IN EXECUTE 'SELECT DISTINCT LEAST(sender_id, receiver_id) AS u1, GREATEST(sender_id, receiver_id) AS u2 FROM direct_messages'
        LOOP
            v_user1 := pair.u1; v_user2 := pair.u2;
            INSERT INTO chat_rooms (is_group, created_at) VALUES (false, now()) RETURNING id INTO v_room_id;
            INSERT INTO chat_participants (room_id, user_id, joined_at) VALUES (v_room_id, v_user1, now()), (v_room_id, v_user2, now());
            EXECUTE format(
                'INSERT INTO chat_messages (id, room_id, sender_id, content, created_at) SELECT id, %L, sender_id, content, created_at FROM direct_messages WHERE (sender_id = %L AND receiver_id = %L) OR (sender_id = %L AND receiver_id = %L) ORDER BY created_at ASC',
                v_room_id, v_user1, v_user2, v_user2, v_user1
            );
        END LOOP;
    END IF;
END $do$;

-- 6. get_conversations RPC
DROP FUNCTION IF EXISTS get_conversations(uuid);

CREATE OR REPLACE FUNCTION get_conversations(p_user_id UUID)
RETURNS TABLE (room_id UUID, is_group BOOLEAN, room_name TEXT, other_user_id UUID, last_message TEXT, last_created_at TIMESTAMP WITH TIME ZONE, unread_count BIGINT)
AS $func$
BEGIN
    RETURN QUERY
    WITH my_rooms AS (
        SELECT cp.room_id, cp.last_read_at, cr.is_group, cr.name as room_name
        FROM chat_participants cp JOIN chat_rooms cr ON cp.room_id = cr.id
        WHERE cp.user_id = p_user_id AND cp.hidden_at IS NULL
    ),
    last_msgs AS (
        SELECT cm.room_id, cm.content as last_message, cm.created_at as last_created_at,
               ROW_NUMBER() OVER(PARTITION BY cm.room_id ORDER BY cm.created_at DESC) as rn
        FROM chat_messages cm JOIN my_rooms mr ON cm.room_id = mr.room_id
    ),
    unread_counts AS (
        SELECT cm.room_id, COUNT(*) as unread_count
        FROM chat_messages cm JOIN my_rooms mr ON cm.room_id = mr.room_id
        WHERE cm.created_at > mr.last_read_at AND cm.sender_id != p_user_id
        GROUP BY cm.room_id
    ),
    other_users AS (
        SELECT cp.room_id, (ARRAY_AGG(cp.user_id))[1] as other_user_id
        FROM chat_participants cp JOIN my_rooms mr ON cp.room_id = mr.room_id
        WHERE mr.is_group = false AND cp.user_id != p_user_id
        GROUP BY cp.room_id
    )
    SELECT mr.room_id, mr.is_group, mr.room_name, ou.other_user_id,
           lm.last_message, lm.last_created_at, COALESCE(uc.unread_count, 0) as unread_count
    FROM my_rooms mr
    LEFT JOIN last_msgs lm ON mr.room_id = lm.room_id AND lm.rn = 1
    LEFT JOIN unread_counts uc ON mr.room_id = uc.room_id
    LEFT JOIN other_users ou ON mr.room_id = ou.room_id
    WHERE lm.last_created_at IS NOT NULL OR mr.is_group = true
    ORDER BY lm.last_created_at DESC;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_conversations(uuid) TO anon, authenticated, service_role;