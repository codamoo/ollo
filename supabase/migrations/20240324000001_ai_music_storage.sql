-- Enable storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('music', 'music', true)
ON CONFLICT (id) DO NOTHING;

-- Update the ai_music_generations table to include audio_url
ALTER TABLE public.ai_music_generations 
ADD COLUMN audio_url text;

-- Create storage policy
CREATE POLICY "Public Access" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'music');

CREATE POLICY "Authenticated users can upload music" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'music' 
  AND auth.role() = 'authenticated'
);