'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

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

export default function SocialFollowing({ userId }: { userId: string }) {
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [stats, setStats] = useState<FollowStats>({
    followers_count: 0,
    following_count: 0,
    is_following: false
  });

  useEffect(() => {
    fetchFollowData();
  }, [userId]);

  async function fetchFollowData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get followers
      const { data: followersData } = await supabase
        .from('follows')
        .select('profiles!follows_follower_id_fkey(*)')
        .eq('following_id', userId);

      // Get following
      const { data: followingData } = await supabase
        .from('follows')
        .select('profiles!follows_following_id_fkey(*)')
        .eq('follower_id', userId);

      // Check if current user is following
      const { data: isFollowing } = await supabase
        .rpc('is_following', {
          follower: user.id,
          following: userId
        });

      // Get follow counts
      const { data: profileData } = await supabase
        .rpc('get_profile', {
          user_id: userId
        });

      setFollowers(followersData?.map(f => f.profiles) || []);
      setFollowing(followingData?.map(f => f.profiles) || []);
      setStats({
        followers_count: profileData?.followers_count || 0,
        following_count: profileData?.following_count || 0,
        is_following: isFollowing || false
      });
    } catch (error) {
      toast.error('Error fetching follow data');
    }
  }

  async function toggleFollow() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (stats.is_following) {
        // Unfollow
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', userId);

        if (error) throw error;
      } else {
        // Follow
        const { error } = await supabase
          .from('follows')
          .insert({
            follower_id: user.id,
            following_id: userId
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
            <span>Followers: {stats.followers_count}</span>
            <span>Following: {stats.following_count}</span>
          </div>
          <Button onClick={toggleFollow}>
            {stats.is_following ? 'Unfollow' : 'Follow'}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-bold mb-4">Followers</h3>
          <div className="space-y-2">
            {followers.map((follower) => (
              <div key={follower.id} className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={follower.avatar_url || undefined} />
                  <AvatarFallback>{follower.username[0]}</AvatarFallback>
                </Avatar>
                <span>{follower.display_name || follower.username}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-bold mb-4">Following</h3>
          <div className="space-y-2">
            {following.map((follow) => (
              <div key={follow.id} className="flex items-center space-x-2">
                <Avatar>
                  <AvatarImage src={follow.avatar_url || undefined} />
                  <AvatarFallback>{follow.username[0]}</AvatarFallback>
                </Avatar>
                <span>{follow.display_name || follow.username}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}