'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Music, ExternalLink } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

interface SpotifyIntegration {
  token_expires_at: string;
  refresh_token: string;
  access_token: string;
  connected: boolean;
  username?: string;
  profile_url?: string;
  display_on_profile: boolean;
}

export default function SpotifyIntegration() {
  const [integration, setIntegration] = useState<SpotifyIntegration>({
    connected: false,
    display_on_profile: true,
    token_expires_at: '',
    refresh_token: '',
    access_token: ''
  });
  const [loading, setLoading] = useState(false);

  // Function to fetch user session
  const fetchUserSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('You need to be logged in to connect Spotify');
      return null;
    }
    return session;
  };

  // Function to fetch or create Spotify integration
  const fetchSpotifyIntegration = async () => {
    const session = await fetchUserSession();
    if (!session) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("No authenticated user found");
        setLoading(false);
        return;
      }

      const { data: integrationData, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', 'spotify')
        .maybeSingle();

      if (integrationError) {
        console.error('Error fetching Spotify integration:', integrationError);
        toast.error('Failed to load Spotify integration');
        setLoading(false);
        return;
      }

      if (integrationData) {
        // Check if the integration is actually connected (has tokens)
        const isConnected = !!(integrationData.access_token && integrationData.refresh_token);
        
        console.log('Spotify integration found:', {
          connected: isConnected,
          username: integrationData.platform_username,
          hasAccessToken: !!integrationData.access_token,
          hasRefreshToken: !!integrationData.refresh_token,
          expiresAt: integrationData.token_expires_at
        });
        
        setIntegration({
          connected: isConnected,
          username: integrationData.platform_username,
          profile_url: integrationData.profile_url,
          display_on_profile: integrationData.display_on_profile,
          access_token: integrationData.access_token,
          refresh_token: integrationData.refresh_token,
          token_expires_at: integrationData.token_expires_at
        });
      } else {
        console.log("No Spotify integration found for user");
        
        // Create a default integration record
        const { error: createError } = await supabase
          .from('integrations')
          .insert({
            user_id: user.id,
            platform: 'spotify',
            display_on_profile: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (createError) {
          console.error('Error creating default Spotify integration:', createError);
          toast.error('Failed to initialize Spotify integration');
        }
        
        setIntegration({
          connected: false,
          display_on_profile: true,
          token_expires_at: '',
          refresh_token: '',
          access_token: ''
        });
      }
    } catch (error) {
      console.error('Error fetching Spotify integration:', error);
      toast.error('Failed to load Spotify integration');
    } finally {
      setLoading(false);
    }
  };

  // Fetch integration data when the component mounts
  useEffect(() => {
    const checkSessionAndFetchIntegration = async () => {
      const session = await fetchUserSession();
      if (session) fetchSpotifyIntegration();
    };

    checkSessionAndFetchIntegration();
  }, []);

  const connectSpotify = async () => {
    console.log("Starting Spotify connection process...");
    setLoading(true);
    try {
      const session = await fetchUserSession();
      if (!session) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User information not available");
        setLoading(false);
        return;
      }

      const response = await fetch(`/api/auth/spotify?userId=${user.id}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.authorizationUrl) {
          window.location.href = data.authorizationUrl;
        } else {
          throw new Error("No authorization URL received from server");
        }
      } else {
        const errorData = await response.json();
        if (errorData.redirectTo) {
          window.location.href = errorData.redirectTo;
        } else {
          throw new Error(`Failed to initiate Spotify OAuth: ${response.status}`);
        }
      }
    } catch (error) {
      console.error('Error starting Spotify OAuth flow:', error);
      toast.error(`Failed to initiate Spotify OAuth: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const disconnectSpotify = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Update the integration instead of deleting it
      const { error } = await supabase
        .from('integrations')
        .update({
          access_token: null,
          refresh_token: null,
          token_expires_at: null,
          platform_username: null,
          profile_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('platform', 'spotify');

      if (error) throw error;

      setIntegration({
        connected: false, 
        display_on_profile: true,
        token_expires_at: '',
        refresh_token: '',
        access_token: ''
      });
      toast.success('Spotify account disconnected');
    } catch (error) {
      console.error('Error disconnecting Spotify:', error);
      toast.error('Failed to disconnect Spotify account');
    } finally {
      setLoading(false);
    }
  };

  const toggleDisplayOnProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newDisplayValue = !integration.display_on_profile;
      
      const { error } = await supabase
        .from('integrations')
        .update({ 
          display_on_profile: newDisplayValue,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('platform', 'spotify');

      if (error) {
        console.error('Error updating Spotify integration:', error);
        toast.error('Failed to update Spotify settings');
        return;
      }

      setIntegration({
        ...integration,
        display_on_profile: newDisplayValue
      });
      
      toast.success(`Spotify ${newDisplayValue ? 'will' : 'will not'} be displayed on your profile`);
    } catch (error) {
      console.error('Error toggling Spotify display:', error);
      toast.error('Failed to update Spotify settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center space-x-4 mb-6">
        <Music className="h-8 w-8 text-green-500" />
        <div>
          <h2 className="text-xl font-bold">Spotify Integration</h2>
          <p className="text-muted-foreground">Connect your Spotify account to share your music</p>
        </div>
      </div>

      {integration.connected ? (
        <div className="space-y-6">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Connected as {integration.username}</p>
                <a 
                  href={integration.profile_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground flex items-center hover:underline"
                >
                  View Spotify Profile
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={disconnectSpotify}
                disabled={loading}
              >
                Disconnect
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show Spotify on profile</p>
              <p className="text-sm text-muted-foreground">Display your currently playing track on your profile</p>
            </div>
            <Switch
              checked={integration.display_on_profile}
              onCheckedChange={toggleDisplayOnProfile}
              disabled={loading}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p>Connect your Spotify account to share your music taste and currently playing tracks with your followers.</p>
          <Button
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            onClick={connectSpotify}
            disabled={loading}
          >
            Connect Spotify
          </Button>
        </div>
      )}
    </Card>
  );
}
