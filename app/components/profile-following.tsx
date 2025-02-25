'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Link from 'next/link';

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FollowStats {
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

interface ProfileFollowingProps {
  profileId: string;
  currentUserId: string | null;
}

export default function ProfileFollowing({ profileId, currentUserId }: ProfileFollowingProps) {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [stats, setStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false
  });

  useEffect(() => {
    fetchFollowData();
  }, [profileId]);

  async function fetchFollowData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Get followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(*)')
        .eq('following_id', profileId);

      // Get following
      const { data: followingData } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(*)')
        .eq('follower_id', profileId);

      // Check if current user is following (only if user is logged in)
      let isFollowing = false;
      if (user) {
        const { data } = await supabase
          .rpc('is_following', {
            follower: user.id,
            following: profileId
          });
        isFollowing = !!data;
      }

      // Get follow count

            const { data: profileData } = await supabase
            .rpc('get_profile', {
              user_id: profileId
            });
            
      setFollowers(followersData?.map(f => f.profiles) || []);
      setFollowing(followingData?.map(f => f.profiles) || []);
      setStats({
        followers_count: profileData?.followers_count || 0,
        following_count: profileData?.following_count || 0,
        is_following: isFollowing
      });
    } catch (error) {
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
          .eq('following_id', profileId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: currentUserId,
            following_id: profileId
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

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex justify-between items-center">
          <div className="space-x-4">
            <span>Followers:{stats.followers_count}</span>
            <span>Following:{stats.following_count}</span>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        <Card className="p-4">
          <h3 className="font-bold mb-4">Followers</h3>
          <div className="space-y-3">
            {followers.map((follower) => (
              <Link 
                href={`/${follower.username}`} 
                key={follower.id}
                className="flex items-center space-x-3 hover:bg-muted p-2 rounded-md transition-colors"
              >
                <Avatar>
                  <AvatarImage src={follower.avatar_url || undefined} />
                  <AvatarFallback>{follower.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{follower.display_name || follower.username}</div>
                  <div className="text-sm text-muted-foreground">@{follower.username}</div>
                </div>
              </Link>
            ))}
            {followers.length === 0 && (
              <p className="text-muted-foreground text-sm">No followers yet</p>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold mb-4">Following</h3>
          <div className="space-y-3">
            {following.map((follow) => (
              <Link 
                href={`/${follow.username}`} 
                key={follow.id}
                className="flex items-center space-x-3 hover:bg-muted p-2 rounded-md transition-colors"
              >
                <Avatar>
                  <AvatarImage src={follow.avatar_url || undefined} />
                  <AvatarFallback>{follow.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{follow.display_name || follow.username}</div>
                  <div className="text-sm text-muted-foreground">@{follow.username}</div>
                </div>
              </Link>
            ))}
            {following.length === 0 && (
              <p className="text-muted-foreground text-sm">Not following anyone yet</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
