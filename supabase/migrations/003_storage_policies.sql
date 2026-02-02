-- Storage policies for walls bucket

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for walls bucket
CREATE POLICY "Public read access for walls" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'walls');

-- Allow anyone to upload to walls bucket
CREATE POLICY "Public insert for walls" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'walls');

-- Allow authenticated users to delete objects in walls bucket
CREATE POLICY "Authenticated delete for walls" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'walls' AND auth.role() = 'authenticated');
