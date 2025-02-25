'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import CreatePost from '@/components/create-post';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { AudioPlayer } from '@/components/ui/audio-player';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PostsList from '@/components/posts-list';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_url: Array<string> | string;
  type: 'text' | 'markdown' | 'music';
  likes_count: number;
  is_liked: boolean;
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
  const [posts, setPosts] = useState([] as PostWithProfile[]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Pass the user ID as a string, or null if not authenticated
      const { data: postsData, error: postsError } = await supabase
        .rpc('get_posts_with_likes', {
          viewer_id: user.id
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

  useEffect(() => {
    fetchCurrentUser();
    fetchPosts();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <main className="max-w-4xl flex mx-auto px-4 py-4">
        <Card className="pb-0 border-none mr-5">
          <CreatePost onPostCreated={fetchPosts} />
        </Card>
        <PostsList 
          posts={posts}
          currentUserId={currentUserId}
          onPostsUpdate={setPosts}
        />
      </main>
    </div>
  );
}
