'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { redirect } from 'next/navigation';
import Navbar from '@/components/navbar';
import PostsList from '@/components/posts-list';
import CreatePost from '@/components/create-post';
import { Card } from '@/components/ui/card';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_url: Array<string> | string;
  type: 'text' | 'markdown' | 'music';
  likes_count: number;
  is_liked: boolean;
  comments_count: number;
  username: string;
  display_name: string | undefined;
  avatar_url: string | undefined;
}

interface Profile {
  user_id: string;
  username: string;
  display_name?: string;
}

interface PostWithProfile extends Post {
  profile?: Profile;
}

const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export default function Dashboard() {
  const [posts, setPosts] = useState<PostWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        redirect('/login');
        return;
      }

      setCurrentUserId(user.id);
      fetchPosts();
    } catch (error) {
      console.error('Error checking user:', error);
      redirect('/login');
    }
  };

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        redirect('/login');
        return;
      }

      const { data: postsData, error: postsError } = await supabase
        .rpc('get_posts_with_likes', {
          viewer_id: user.id.toString(),
          profile_username: null
        });

      if (postsError) throw postsError;

      setPosts(postsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error fetching posts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-6">
          <Card className="p-4">
            <CreatePost onPostCreated={fetchPosts} />
          </Card>
          <PostsList 
            posts={posts}
            currentUserId={currentUserId}
            onPostsUpdate={(updatedPosts) => {
              setPosts(updatedPosts as unknown as PostWithProfile[]);
            }}
          />
        </div>
      </main>
    </div>
  );
}
