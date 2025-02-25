-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a table for user profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  website text,
  location text,
  email text UNIQUE,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create a table for user settings
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  theme text DEFAULT 'light',
  language text DEFAULT 'en',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create a table for user follows
CREATE TABLE IF NOT EXISTS public.follows (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  follower_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles(username);
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS follows_follower_id_idx ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_id_idx ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS user_settings_user_id_idx ON public.user_settings(user_id);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- Create security policies for profiles
CREATE POLICY "Profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can insert their own profile" 
  ON public.profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Create security policies for user settings
CREATE POLICY "Users can view their own settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings" 
  ON public.user_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create security policies for follows
CREATE POLICY "Anyone can view follows" 
  ON public.follows FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can follow others" 
  ON public.follows FOR INSERT 
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow" 
  ON public.follows FOR DELETE 
  USING (auth.uid() = follower_id);

-- Create functions for managing timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updating timestamps
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to get user profile
CREATE OR REPLACE FUNCTION public.get_profile(user_id UUID)
RETURNS json AS $$
DECLARE
  followers_count integer;
  following_count integer;
  profile_record record;
BEGIN
  -- Get the followers count
  SELECT COUNT(*)::integer INTO followers_count
  FROM public.follows
  WHERE following_id = user_id;

  -- Get the following count
  SELECT COUNT(*)::integer INTO following_count
  FROM public.follows
  WHERE follower_id = user_id;

  -- Get the profile data
  SELECT * INTO profile_record
  FROM public.profiles
  WHERE id = user_id;

  RETURN json_build_object(
    'id', profile_record.id,
    'username', profile_record.username,
    'display_name', profile_record.display_name,
    'avatar_url', profile_record.avatar_url,
    'bio', profile_record.bio,
    'website', profile_record.website,
    'location', profile_record.location,
    'is_verified', profile_record.is_verified,
    'created_at', profile_record.created_at,
    'followers_count', followers_count,
    'following_count', following_count
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to check if a user is following another user
CREATE OR REPLACE FUNCTION public.is_following(follower uuid, following uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.follows f
    WHERE f.follower_id = follower 
    AND f.following_id = following
  );
END;
$$ LANGUAGE plpgsql STABLE;
