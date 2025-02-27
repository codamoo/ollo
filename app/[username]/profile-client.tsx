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
import { UserCircle2, MapPin, Link as LinkIcon, Calendar, BadgeCheck, Copy, Share2 } from 'lucide-react';
import PostsList from '@/components/posts-list';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import SpotifyPlayer from '../components/spotify-player';
import MagicPortfolio from '../components/magic-portfolio';
import SocialLinks from '../components/social-links';
import YouTubeVideos from '../components/youtube-videos';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  is_verified?: boolean;
  joined_date?: string;
}

interface PostWithProfile extends Post {
  profile?: Profile;
}

interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned_at: string;
}

interface ProfileStats {
  total_posts: number;
  total_likes_received: number;
  total_views: number;
  join_streak_days: number;
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
    created_at: '',
    is_verified: false,
    joined_date: ''
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
  const [copied, setCopied] = useState(false);
  const [customization, setCustomization] = useState({
    gradient_from: 'var(--profile-gradient-from)',
    gradient_to: 'var(--profile-gradient-to)',
    layout: 'default'
  });
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [featuredPost, setFeaturedPost] = useState<PostWithProfile | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    total_posts: 0,
    total_likes_received: 0,
    total_views: 0,
    join_streak_days: 0
  });

  useEffect(() => {
    fetchProfile();
  }, [username]);

  useEffect(() => {
    if (profile.id) {
      fetchFollowData();
      fetchUserPosts();
      fetchAchievements();
      fetchFeaturedPost();
      fetchProfileStats();
    }
  }, [profile.id]);

  async function fetchProfile() {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();
      
      if (error) throw error
      if (!data) {
        setError('Profile not found')
        return
      }
      
      setProfile(data)
      await Promise.all([
        fetchProfileStats(),
        fetchFeaturedPost()
      ])
    } catch (error) {
      console.error('Error fetching profile:', error)
      setError(error instanceof Error ? error.message : 'Failed to load profile')
    } finally {
      setLoading(false)
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
          viewer_id: profile?.id || null
        })
        .eq('id', profile.id)
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

  // Function to copy profile URL to clipboard
  const copyProfileUrl = () => {
    try {
      const url = `${window.location.origin}/${profile.username}`;
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true);
          toast.success('Profile URL copied to clipboard');
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error('Failed to copy: ', err);
          // Fallback for browsers that don't support clipboard API
          fallbackCopyTextToClipboard(url);
        });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy URL');
    }
  };

  // Fallback copy method for older browsers
  const fallbackCopyTextToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Make the textarea out of viewport
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        setCopied(true);
        toast.success('Profile URL copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error('Failed to copy URL');
      }
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
      toast.error('Failed to copy URL');
    }

    document.body.removeChild(textArea);
  };

  // Function to share profile
  const shareProfile = async () => {
    const url = `${window.location.origin}/${profile.username}`;
    const title = `Check out ${profile.display_name || profile.username}'s profile`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url
        });
        toast.success('Profile shared successfully');
      } catch (error) {
        console.error('Error sharing:', error);
        if (error instanceof Error && error.name !== 'AbortError') {
          toast.error('Error sharing profile');
        }
      }
    } else {
      // If Web Share API is not available, fall back to copying the URL
      copyProfileUrl();
    }
  };

  // Format joined date
  const formatJoinedDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  async function fetchAchievements() {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievements (*)
        `)
        .eq('user_id', profile.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      setAchievements(data);
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  }

  async function fetchFeaturedPost() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .rpc('get_featured_post', {
          profile_id: profile.id,
          viewer_id: user?.id || null
        });

      if (error) throw error;
      setFeaturedPost(data);
    } catch (error) {
      console.error('Error fetching featured post:', error);
    }
  }

  async function fetchProfileStats() {
    try {
      const { data, error } = await supabase
        .rpc('get_profile_stats', { profile_id: profile.id });
      
      if (error) throw error;
      setProfileStats(data);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    }
  }

  if (loading) return <Loading />;
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500">{error}</h1>
            <p className="mt-2 text-gray-600">
              The profile you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
        <div className="absolute -bottom-16 left-1/2 md:left-1/2 md:-translate-x-1/2">
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
      <main className="max-w-7xl mx-auto px-4 pt-20 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Profile Info */}
          <div className="md:col-span-1">
            {/* Profile Details */}
            <div className="mb-8">
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <h1 className="text-3xl font-bold">{profile.display_name || username}</h1>
                    {profile.is_verified && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <BadgeCheck className="h-5 w-5 text-blue-500" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Verified Account</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-muted-foreground">@{profile.username}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={copyProfileUrl}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{copied ? 'Copied!' : 'Copy username'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6" 
                            onClick={shareProfile}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Share profile</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="h-3 w-3 mr-1" />
                      Joined {formatJoinedDate(profile.created_at)}
                    </Badge>
                  </div>
                </div>
                {currentUserId && currentUserId !== profile.id && (
                    <Button 
                      className="mt-2"
                      onClick={handleFollow}
                      variant={stats.is_following ? "outline" : "default"}
                    >
                      {stats.is_following ? 'Unfollow' : 'Follow'}
                    </Button>
                  )}
                            {currentUserId && currentUserId === profile.id && (
                              <Button variant="outline" onClick={() => window.location.href = '/settings'}>
                                Edit Profile
                              </Button>
                            )}
              </div>
            </div>

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

            {/* Social Links */}
            <div className="mb-6">
              <SocialLinks userId={profile.id} isOwner={currentUserId === profile.id} />
            </div>

            <Card className="p-4 mb-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{profileStats.total_posts}</p>
                  <p className="text-sm text-muted-foreground">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileStats.total_likes_received}</p>
                  <p className="text-sm text-muted-foreground">Likes</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileStats.total_views}</p>
                  <p className="text-sm text-muted-foreground">Profile Views</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{profileStats.join_streak_days}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
              </div>
            </Card>

            {/* Spotify Player */}

            <SpotifyPlayer userId={profile.id} />

            {currentUserId === profile.id && (
              <Card className="p-4 mb-6">
                <h3 className="font-bold mb-4">Customize Profile</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Banner Gradient</label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        type="color" 
                        value={customization.gradient_from}
                        onChange={(e) => setCustomization(prev => ({
                          ...prev,
                          gradient_from: e.target.value
                        }))}
                      />
                      <Input 
                        type="color" 
                        value={customization.gradient_to}
                        onChange={(e) => setCustomization(prev => ({
                          ...prev,
                          gradient_to: e.target.value
                        }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Layout</label>
                    <select 
                      className="w-full mt-2 rounded-md border"
                      value={customization.layout}
                      onChange={(e) => setCustomization(prev => ({
                        ...prev,
                        layout: e.target.value
                      }))}
                    >
                      <option value="default">Default</option>
                      <option value="compact">Compact</option>
                      <option value="grid">Grid</option>
                    </select>
                  </div>
                  <Button onClick={ () => console.log(customization) }>
                    Save Changes
                  </Button>
                </div>
              </Card>
            )}

            {achievements.length > 0 && (
              <Card className="p-4 mb-6">
                <h3 className="font-bold mb-4">Achievements</h3>
                <div className="flex flex-wrap gap-2">
                  {achievements.map((achievement) => (
                    <TooltipProvider key={achievement.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <img 
                              src={achievement.icon} 
                              alt={achievement.name}
                              className="w-6 h-6"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-sm">
                            <p className="font-bold">{achievement.name}</p>
                            <p>{achievement.description}</p>
                            <p className="text-xs text-muted-foreground">
                              Earned {new Date(achievement.earned_at).toLocaleDateString()}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </Card>
            )}

            <ProfileFollowing profileId={profile.id} currentUserId={currentUserId} />
          </div>

          {/* Right Column - Tabbed Content */}
          <div className="md:col-span-2">
            {featuredPost && (
              <Card className="p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Featured Post</h3>
                  {currentUserId === profile.id && (
                    <Button variant="outline" size="sm" onClick={() => {/* Add logic to change featured post */}}>
                      Change
                    </Button>
                  )}
                </div>
                <PostsList 
                  posts={[featuredPost]}
                  currentUserId={currentUserId}
                  onPostsUpdate={() => fetchFeaturedPost()}
                />
              </Card>
            )}
            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="videos">YouTube</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                <PostsList 
                  posts={userPosts}
                  currentUserId={currentUserId}
                  onPostsUpdate={setUserPosts}
                />
              </TabsContent>

              <TabsContent value="videos" className="mt-6">
                <YouTubeVideos userId={profile.id} />
              </TabsContent>

              <TabsContent value="portfolio" className="mt-6">
                <MagicPortfolio 
                  userId={profile.id} 
                  isOwner={currentUserId === profile.id} 
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}
