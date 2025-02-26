-- Add platform_username and profile_url columns to integrations table
ALTER TABLE public.integrations 
ADD COLUMN IF NOT EXISTS platform_username text,
ADD COLUMN IF NOT EXISTS profile_url text,
ADD COLUMN IF NOT EXISTS display_on_profile boolean DEFAULT true;

-- Create a table for storing currently playing tracks
CREATE TABLE IF NOT EXISTS public.spotify_currently_playing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  artist_name text NOT NULL,
  album_name text NOT NULL,
  album_art_url text,
  preview_url text,
  external_url text NOT NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on the new table
ALTER TABLE public.spotify_currently_playing ENABLE ROW LEVEL SECURITY;

-- Create policies for the spotify_currently_playing table
CREATE POLICY "Currently playing tracks are viewable by everyone"
  ON public.spotify_currently_playing FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own currently playing track"
  ON public.spotify_currently_playing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own currently playing track"
  ON public.spotify_currently_playing FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own currently playing track"
  ON public.spotify_currently_playing FOR DELETE
  USING (auth.uid() = user_id);