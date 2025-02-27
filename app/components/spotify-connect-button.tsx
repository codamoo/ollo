'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SpotifyConnectButton() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const router = useRouter();

  const refreshToken = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('No authenticated user');
      }

      const response = await fetch('/api/spotify/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to refresh token');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error refreshing token:', error);
      throw error;
    }
  };

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check client-side auth
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);

        // Fetch debug info from server for verification
        const response = await fetch('/api/auth/debug', { credentials: 'include' });
        const debugData = await response.json();
        setDebugInfo(debugData);

        console.log('Client auth:', !!session);
        console.log('Server auth debug:', debugData);

        // If there's a mismatch between client and server session, sync them
        if (session && !debugData.authenticated) {
          console.log('Attempting to sync client and server sessions...');
          
          const syncResponse = await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              token: session.access_token,
              refresh_token: session.refresh_token,
            }),
          });

          const syncResult = await syncResponse.json();
          console.log('Sync result:', syncResult);

          if (syncResult.error) {
            setSyncError(syncResult.error);
            console.error('Sync error:', syncResult);
          }

          if (syncResult.success) {
            // After syncing, check server auth again
            const newResponse = await fetch('/api/auth/debug', { credentials: 'include' });
            const newDebugData = await newResponse.json();
            setDebugInfo(newDebugData);
            console.log('Server auth after sync:', newDebugData);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setSyncError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      
      // Ensure session is fresh before proceeding
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        console.error('Authentication error:', error);
        toast.error('Please log in to connect Spotify');
        router.push(`/login?redirect=${encodeURIComponent('/settings')}`);
        return;
      }

      console.log('Session before sync:', {
        access_token: session.access_token ? 'present' : 'missing',
        refresh_token: session.refresh_token ? 'present' : 'missing',
        expires_at: session.expires_at,
      });

      // Sync the session with the server
      const syncResponse = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          token: session.access_token,
          refresh_token: session.refresh_token,
        }),
      });

      const syncResult = await syncResponse.json();
      console.log('Pre-connect sync result:', syncResult);

      if (syncResult.error) {
        console.error('Sync error:', syncResult);
        throw new Error(`Failed to sync authentication: ${syncResult.error}`);
      }

      // Request the Spotify authorization URL
      const response = await fetch('/api/auth/spotify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        credentials: 'include',
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (data.redirectTo) {
          router.push(data.redirectTo);
          return;
        }
        throw new Error(data.error || 'Failed to connect to Spotify');
      }

      // Redirect to Spotify authorization URL
      window.location.href = data.authorizationUrl;
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      toast.error(`Failed to connect to Spotify: ${(error as Error).message}`);
      setSyncError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Button disabled>Loading...</Button>;
  }

  // Debug display for developer
  const debugDisplay = (
    <div className="text-xs mt-2 text-muted-foreground">
      Client auth: {isAuthenticated ? 'Yes' : 'No'}, 
      Server auth: {debugInfo?.authenticated ? 'Yes' : 'No'}
      {syncError && <div className="text-red-500">Error: {syncError}</div>}
    </div>
  );

  return (
    <div>
      <Button
        className="w-full bg-green-500 hover:bg-green-600 text-white"
        onClick={handleConnect}
        disabled={isLoading}>
        {isAuthenticated ? 'Spotify connected successfully' : 'Connect Spotify'}
      </Button>
      {debugDisplay}
    </div>
  );
}
