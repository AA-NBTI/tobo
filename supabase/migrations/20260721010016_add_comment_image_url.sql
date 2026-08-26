-- 1. comments 테이블에 image_url 컬럼 추가
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS image_url text;

-- 2. comment-images 버킷 생성 (저장소 생성)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comment-images', 'comment-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage 보안 정책 (RLS) 설정
-- 전체 공개 읽기 권한
CREATE POLICY "Public Access for comment-images" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'comment-images');

-- 인증된 사용자만 업로드 가능 권한
CREATE POLICY "Auth Users Upload for comment-images" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'comment-images');

-- 자신이 올린 이미지만 삭제/수정 가능 (선택 사항)
CREATE POLICY "Users Update/Delete their own comment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'comment-images' AND auth.uid() = owner);

CREATE POLICY "Users Delete their own comment images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'comment-images' AND auth.uid() = owner);
