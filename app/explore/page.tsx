'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCircle2, Search, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Loading from '@/components/loading';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_verified?: boolean;
  followers_count?: number;
}

export default function ExplorePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchProfiles();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProfiles(profiles);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = profiles.filter(
        profile => 
          profile.username.toLowerCase().includes(query) || 
          (profile.display_name && profile.display_name.toLowerCase().includes(query)) ||
          (profile.bio && profile.bio.toLowerCase().includes(query))
      );
      setFilteredProfiles(filtered);
    }
  }, [searchQuery, profiles]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('Error fetching user:', error);
        setCurrentUserId(null);
        return;
      }
      setCurrentUserId(user?.id || null);
    } catch (error) {
      console.error('Error in fetchCurrentUser:', error);
      setCurrentUserId(null);
    }
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      
      // Get profiles with follower counts
      const { data, error } = await supabase
        .rpc('get_profiles_with_follower_counts')
        .order('followers_count', { ascending: false });

      if (error) throw error;
      
      setProfiles(data || []);
      setFilteredProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast.error('Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The filtering is already handled by the useEffect
  };

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Loading />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold">Explore Profiles</h1>
          <Badge variant="secondary" className="text-sm">
            {profiles.length} {profiles.length === 1 ? 'user' : 'users'}
          </Badge>
        </div>
        
        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Search by username, name, or bio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </form>
        
        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.length > 0 ? (
            filteredProfiles.map((profile) => (
              <Link href={`/${profile.username}`} key={profile.id}>
                <Card className="p-4 hover:bg-accent transition-colors cursor-pointer h-full flex flex-col">
                  <div className="flex items-center space-x-4">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={`${profile.display_name || profile.username}'s avatar`}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <UserCircle2 className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium truncate">
                          {profile.display_name || profile.username}
                        </p>
                        {profile.is_verified && (
                          <BadgeCheck className="h-4 w-4 text-blue-500 ml-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        @{profile.username}
                      </p>
                      {profile.followers_count !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          {profile.followers_count} {profile.followers_count === 1 ? 'follower' : 'followers'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex-grow">
                    {profile.bio ? (
                      <p className="text-sm line-clamp-2">{profile.bio}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No bio provided</p>
                    )}
                  </div>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full text-center py-8">
              <p className="text-muted-foreground">No profiles found matching your search.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
