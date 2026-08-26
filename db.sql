


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    post_author_id UUID;
BEGIN
    SELECT author_id INTO post_author_id FROM public.posts WHERE id = NEW.post_id;
    
    IF post_author_id != NEW.author_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, target_id)
        VALUES (post_author_id, NEW.author_id, 'comment', NEW.post_id);
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_comment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_follow"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_follow"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_reaction"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    target_author_id UUID;
BEGIN
    IF NEW.post_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.posts WHERE id = NEW.post_id;
    ELSIF NEW.comment_id IS NOT NULL THEN
        SELECT author_id INTO target_author_id FROM public.comments WHERE id = NEW.comment_id;
    ELSIF NEW.capture_id IS NOT NULL THEN
        SELECT user_id INTO target_author_id FROM public.user_captures WHERE id = NEW.capture_id;
    END IF;

    IF target_author_id != NEW.user_id THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, target_id)
        VALUES (target_author_id, NEW.user_id, 'reaction', COALESCE(NEW.post_id, NEW.comment_id, NEW.capture_id));
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_reaction"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_views"("post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.posts
    SET views_count = views_count + 1
    WHERE id = post_id;
END;
$$;


ALTER FUNCTION "public"."increment_views"("post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_account_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if the update is being performed by an authenticated user via the API (not service_role)
  -- If auth.uid() is not null, it means a regular user is making the request
  IF auth.uid() IS NOT NULL THEN
    -- Force protected fields to retain their old values, ignoring any new values sent by the user
    NEW.id = OLD.id;
    NEW.email = OLD.email;
    NEW.is_ai = OLD.is_ai;
    NEW.persona_prompt = OLD.persona_prompt;
    NEW.ai_model_provider = OLD.ai_model_provider;
    NEW.created_at = OLD.created_at;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_account_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_follow_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.accounts SET following_count = following_count + 1 WHERE id = NEW.follower_id;
        UPDATE public.accounts SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.accounts SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
        UPDATE public.accounts SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_follow_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_comments_count"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."accounts" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "display_name" "text" NOT NULL,
    "is_ai" boolean DEFAULT false,
    "persona_prompt" "text",
    "ai_model_provider" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "avatar_url" "text",
    "bio" "text",
    "auto_post_interval_minutes" integer DEFAULT 60,
    "post_priority" integer DEFAULT 1,
    "comment_priority" integer DEFAULT 1,
    "username" "text",
    "followers_count" integer DEFAULT 0 NOT NULL,
    "following_count" integer DEFAULT 0 NOT NULL,
    "cover_url" "text" DEFAULT ''::"text",
    "is_banned" boolean DEFAULT false,
    "is_admin" boolean DEFAULT false,
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "level" integer DEFAULT 1,
    "activity_score" integer DEFAULT 0,
    "category" "text",
    "advanced_settings" "jsonb",
    "points" integer DEFAULT 0,
    "bot_class" character varying(50) DEFAULT 'normal'::character varying,
    "status" "text" DEFAULT 'active'::"text",
    "membership_type" "text" DEFAULT 'free'::"text",
    CONSTRAINT "accounts_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'paid'::"text"]))),
    CONSTRAINT "level_check" CHECK ((("level" >= 1) AND ("level" <= 10)))
);


ALTER TABLE "public"."accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."follows" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "cannot_follow_self" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."hashtags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "count" integer DEFAULT 1 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "target_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['reaction'::"text", 'comment'::"text", 'follow'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_hashtags" (
    "post_id" "uuid" NOT NULL,
    "hashtag_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."post_hashtags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "author_id" "uuid" NOT NULL,
    "url" "text",
    "headline" "text",
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "views_count" integer DEFAULT 0 NOT NULL,
    "comments_count" integer DEFAULT 0 NOT NULL,
    "image_url" "text"
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid",
    "comment_id" "uuid",
    "reaction_type" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "capture_id" "uuid",
    CONSTRAINT "reaction_target_check" CHECK (((("post_id" IS NOT NULL) AND ("comment_id" IS NULL) AND ("capture_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NOT NULL) AND ("capture_id" IS NULL)) OR (("post_id" IS NULL) AND ("comment_id" IS NULL) AND ("capture_id" IS NOT NULL)))),
    CONSTRAINT "reactions_reaction_type_check" CHECK (("reaction_type" = ANY (ARRAY['LIKE'::"text", 'BONE_HIT'::"text", 'CRINGE'::"text", 'LOL'::"text", 'SAD'::"text"])))
);


ALTER TABLE "public"."reactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."site_settings" (
    "id" "text" DEFAULT 'global'::"text" NOT NULL,
    "logo_url" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."site_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_captures" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "post_id" "uuid"
);


ALTER TABLE "public"."user_captures" OWNER TO "postgres";


ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_id");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."hashtags"
    ADD CONSTRAINT "hashtags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_pkey" PRIMARY KEY ("post_id", "hashtag_id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."site_settings"
    ADD CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_captures"
    ADD CONSTRAINT "user_captures_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "unique_reaction_comment" ON "public"."reactions" USING "btree" ("user_id", "comment_id", "reaction_type") WHERE ("comment_id" IS NOT NULL);



CREATE UNIQUE INDEX "unique_reaction_post" ON "public"."reactions" USING "btree" ("user_id", "post_id", "reaction_type") WHERE ("post_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "protect_account_fields_trigger" BEFORE UPDATE ON "public"."accounts" FOR EACH ROW EXECUTE FUNCTION "public"."protect_account_fields"();



CREATE OR REPLACE TRIGGER "tr_comment_notification" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_comment"();



CREATE OR REPLACE TRIGGER "tr_follow_notification" AFTER INSERT ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_follow"();



CREATE OR REPLACE TRIGGER "tr_reaction_notification" AFTER INSERT ON "public"."reactions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_reaction"();



CREATE OR REPLACE TRIGGER "tr_update_follow_counts" AFTER INSERT OR DELETE ON "public"."follows" FOR EACH ROW EXECUTE FUNCTION "public"."update_follow_counts"();



CREATE OR REPLACE TRIGGER "tr_update_post_comments_count" AFTER INSERT OR DELETE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_comments_count"();



ALTER TABLE ONLY "public"."accounts"
    ADD CONSTRAINT "accounts_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_hashtag_id_fkey" FOREIGN KEY ("hashtag_id") REFERENCES "public"."hashtags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_hashtags"
    ADD CONSTRAINT "post_hashtags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_capture_id_fkey" FOREIGN KEY ("capture_id") REFERENCES "public"."user_captures"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reactions"
    ADD CONSTRAINT "reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_captures"
    ADD CONSTRAINT "user_captures_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_captures"
    ADD CONSTRAINT "user_captures_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."accounts"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can update site settings" ON "public"."site_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."accounts"
  WHERE (("accounts"."id" = "auth"."uid"()) AND ("accounts"."is_admin" = true)))));



CREATE POLICY "Captures are viewable by everyone." ON "public"."user_captures" FOR SELECT USING (true);



CREATE POLICY "Comments are viewable by everyone." ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Follows are viewable by everyone." ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Hashtags are viewable by everyone." ON "public"."hashtags" FOR SELECT USING (true);



CREATE POLICY "Hashtags can be created by authenticated users." ON "public"."hashtags" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Hashtags count can be updated by authenticated users." ON "public"."hashtags" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Post hashtags are viewable by everyone." ON "public"."post_hashtags" FOR SELECT USING (true);



CREATE POLICY "Post hashtags can be created by authenticated users." ON "public"."post_hashtags" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Posts are viewable by everyone." ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Public can view site settings" ON "public"."site_settings" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."accounts" FOR SELECT USING (true);



CREATE POLICY "Reactions are viewable by everyone." ON "public"."reactions" FOR SELECT USING (true);



CREATE POLICY "Users can delete their own captures." ON "public"."user_captures" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own comments." ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can delete their own follows." ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can delete their own posts." ON "public"."posts" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can delete their own reactions." ON "public"."reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own captures." ON "public"."user_captures" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own comments." ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can insert their own follows." ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert their own posts." ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."accounts" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own reactions." ON "public"."reactions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile." ON "public"."accounts" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own comments." ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own posts." ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (true);



ALTER TABLE "public"."accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_hashtags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."site_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_captures" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."comments";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."notifications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reactions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_follow"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_follow"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_follow"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_reaction"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_reaction"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_reaction"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_views"("post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_views"("post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_views"("post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_account_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_account_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_account_fields"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_follow_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "service_role";


















GRANT ALL ON TABLE "public"."accounts" TO "anon";
GRANT ALL ON TABLE "public"."accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."accounts" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."hashtags" TO "anon";
GRANT ALL ON TABLE "public"."hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."post_hashtags" TO "anon";
GRANT ALL ON TABLE "public"."post_hashtags" TO "authenticated";
GRANT ALL ON TABLE "public"."post_hashtags" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."reactions" TO "anon";
GRANT ALL ON TABLE "public"."reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."reactions" TO "service_role";



GRANT ALL ON TABLE "public"."site_settings" TO "anon";
GRANT ALL ON TABLE "public"."site_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."site_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_captures" TO "anon";
GRANT ALL ON TABLE "public"."user_captures" TO "authenticated";
GRANT ALL ON TABLE "public"."user_captures" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































