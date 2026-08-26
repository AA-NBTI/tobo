DROP POLICY IF EXISTS "Auth Users Upload for comment-images" ON storage.objects;

CREATE POLICY "Allow authenticated inserts to comment-images"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'comment-images');
