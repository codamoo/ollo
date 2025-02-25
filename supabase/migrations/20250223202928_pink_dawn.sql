/*
  # Initial Schema Setup for Social Platform

  1. New Tables
    - users
      - Extended profile for auth.users
      - Stores user profile information
    - posts
      - Social content posts
      - Supports rich text and media
    - likes
      - Tracks post likes/hi-5s
    - integrations
      - Stores social media integration settings
    
  2. Security
    - RLS enabled on all tables
    - Policies for user-specific access
*/

-- Create users table that extends auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Drop existing posts table if it exists
DROP TABLE IF EXISTS public.posts CASCADE;

-- Create posts table with correct foreign key relationship
CREATE TABLE IF NOT EXISTS public.posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text DEFAULT 'text' NOT NULL,
  media_url text[] DEFAULT '{}' NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON public.posts(user_id);

-- Enable RLS on posts table
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create likes table
CREATE TABLE IF NOT EXISTS public.likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS public.integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  platform_user_id text,
  access_token text,
  refresh_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Posts are viewable by everyone"
  ON public.posts FOR SELECT
  USING (true);

CREATE POLICY "Users can create posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own likes"
  ON public.likes FOR ALL
  USING (auth.uid() = user_id);

-- Integrations policies
CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own integrations"
  ON public.integrations FOR ALL
  USING (auth.uid() = user_id);
