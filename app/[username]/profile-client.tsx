'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import Loading from '@/components/loading';
import ErrorMessage from '@/components/error-message';
import ProfileFollowing from '../components/profile-following';
import ProfileSettings from '../components/profile-settings';
import { UserCircle2, MapPin, Link as LinkIcon, Calendar } from 'lucide-react';
import PostsList from '@/components/posts-list';

interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  media_url: Array<string> | string; // Updated type to handle both string and array
  type: 'text' | 'markdown' | 'music';
  likes_count: number;
  is_liked: boolean;
}

interface Profile {
  id: string;
  username?: string;
  display_name?: string;
}

interface PostWithProfile extends Post {
  profile?: Profile;
}

interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

export default function ProfileClient({ username }: { username: string }): JSX.Element {
  const [profile, setProfile] = useState({
    username: '',
    display_name: '',
    avatar_url: '',
    bio: '',
    id: '',
    location: '',
    website: '',
    created_at: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [stats, setStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false
  });
  const [userPosts, setUserPosts] = useState<PostWithProfile[]>([]);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile.id) {
      fetchFollowData();
      fetchUserPosts();
    }
  }, [profile.id]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;

      if (data) {
        setProfile(data);
        setCurrentUserId(data.id);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred while fetching the profile';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFollowData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Get followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(*)')
        .eq('following_id', profile.id);

      // Get following
      const { data: followingData } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(*)')
        .eq('follower_id', profile.id);

      // Check if current user is following (only if user is logged in)
      let isFollowing = false;
      if (user) {
        const { data: followCheck } = await supabase
          .from('follows')
          .select('*')
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
          .single();
        
        isFollowing = !!followCheck;
      }

      // Get follow counts directly
      const { data: followerCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id);

      const { data: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id);

      setFollowers(followersData?.map((f: { profiles: any; }) => f.profiles) || []);
      setFollowing(followingData?.map((f: { profiles: any; }) => f.profiles) || []);
      setStats({
        followers_count: followerCount?.count || 0,
        following_count: followingCount?.count || 0,
        is_following: isFollowing
      });
    } catch (error) {
      console.error('Error fetching follow data:', error);
      toast.error('Error fetching follow data');
    }
  }

  async function handleFollow() {
    try {
      if (!currentUserId) {
        toast.error('Please sign in to follow users');
        return;
      }

      if (stats.is_following) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profile.id);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profile.id
          });

        if (error) throw error;
      }

      // Refresh data
      fetchFollowData();
      toast.success(stats.is_following ? 'Unfollowed successfully' : 'Followed successfully');
    } catch (error) {
      toast.error('Error updating follow status');
    }
  }

  const fetchUserPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get posts with likes using the RPC function
      const { data: postsData, error: postsError } = await supabase
        .rpc('get_posts_with_likes', {
          viewer_id: user?.id || null
        })
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Map the posts with author information
      const postsWithAuthor = postsData.map((post: PostWithProfile) => ({
        ...post,
        author_username: profile.username,
        author_display_name: profile.display_name,
        author_avatar_url: profile.avatar_url
      }));

      setUserPosts(postsWithAuthor);

    } catch (error) {
      console.error('Error:', error);
      toast.error('Error fetching posts');
    }
  };

  if (loading) return <Loading />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header/Banner Section */}
      <div 
        className="h-48 relative"
        style={{
          background: `linear-gradient(to right, hsl(var(--profile-gradient-from)), hsl(var(--profile-gradient-to)))`
        }}
      >
        <div className="absolute -bottom-16 left-8">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`${profile.display_name || username}'s avatar`}
              className="w-32 h-32 rounded-full border-4 border-background"
            />
          ) : (
            <div className="w-32 h-32 rounded-full border-4 border-background bg-muted flex items-center justify-center">
              <UserCircle2 className="w-16 h-16 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <main className="max-w-4xl mx-auto px-4 pt-20 pb-8">
        {/* Profile Details */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex space-y-2">
            <div className="grid items-center">
              <h1 className="text-3xl font-bold">{profile.display_name || username}</h1>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>
            {currentUserId && currentUserId !== profile.id && (
              <Button 
                className="ml-3"
                onClick={handleFollow}
                variant={stats.is_following ? "outline" : "default"}
              >
                {stats.is_following ? 'Unfollow' : 'Follow'}
              </Button>
            )}
          </div>
          {currentUserId && (
            <Button variant="outline" onClick={() => {}}>
              Edit Profile
            </Button>
          )}
        </div>

        {/* Tabs or Sections */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div>
                    {/* Bio */}
        {profile.bio && (
          <p className="text-lg mb-6">{profile.bio}</p>
        )}

        {/* Location and Website */}
        <div className="flex space-x-4 mb-6">
          {profile.location && (
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">{profile.location}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-muted-foreground" />
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:underline">
                {profile.website}
              </a>
            </div>
          )}
        </div>
            <ProfileFollowing profileId={profile.id} currentUserId={currentUserId} />
          </div>
          <div className="md:col-span-2">
              <h2 className="text-xl font-semibold mb-4">Posts</h2>
              <PostsList 
                posts={userPosts}
                currentUserId={currentUserId}
                onPostsUpdate={setUserPosts}
              />
          </div>
        </div>
      </main>
    </div>
  );
}
