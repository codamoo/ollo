'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Music, Pause, Play, ExternalLink, Volume2, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Column, Heading, Icon, Row, Button, IconButton } from '@/once-ui/components';

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  album_art: string;
  preview_url: string | null;
  external_url: string;
}

export default function SpotifyPlayer({ userId }: { userId: string }) {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentlyPlaying();
    
    // Set up an interval to refresh the track data every minute
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        refreshTrack();
      }
    }, 60000); // 1 minute
    
    return () => {
      clearInterval(intervalId);
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [userId]);

  const fetchCurrentlyPlaying = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First check if the user has enabled Spotify display on their profile
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'spotify')
        .single();
      
      if (integrationError || !integration || !integration.display_on_profile) {
        setShowPlayer(false);
        return;
      }
      
      setShowPlayer(true);
      
      // Fetch real data from the Spotify API endpoint
      const response = await fetch(`/api/spotify/currently-playing?userId=${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch currently playing track');
      }
      
      const data = await response.json();
      
      // If no track is playing
      if (!data.isPlaying) {
        setTrack(null);
        return;
      }
      
      // Set the track data
      setTrack({
        id: data.track.id,
        name: data.track.name,
        artist: data.track.artist,
        album: data.track.album,
        album_art: data.track.album_art,
        preview_url: data.track.preview_url,
        external_url: data.track.external_url
      });
      
      // Initialize audio if there's a preview URL
      if (data.track.preview_url) {
        const newAudio = new Audio(data.track.preview_url);
        setAudio(newAudio);
      }
    } catch (error) {
      console.error('Error fetching Spotify data:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshTrack = async () => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Call the API endpoint to fetch current track from Spotify and update the database
      const response = await fetch(`/api/spotify/currently-playing?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh currently playing track');
      }
      
      const data = await response.json();
      
      // If no track is playing
      if (!data.isPlaying) {
        setTrack(null);
        return;
      }
      
      // Update the track data
      setTrack({
        id: data.track.id,
        name: data.track.name,
        artist: data.track.artist,
        album: data.track.album,
        album_art: data.track.album_art,
        preview_url: data.track.preview_url,
        external_url: data.track.external_url
      });
      
      // Update audio if there's a preview URL and it's different from the current one
      if (data.track.preview_url && (!audio || audio.src !== data.track.preview_url)) {
        if (audio) {
          audio.pause();
        }
        const newAudio = new Audio(data.track.preview_url);
        setAudio(newAudio);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error('Error refreshing Spotify data:', error);
      setError((error as Error).message);
    } finally {
      setRefreshing(false);
    }
  };

  const togglePlay = () => {
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setError('Could not play preview. Try again later.');
      });
    }
    
    setIsPlaying(!isPlaying);
  };

  if (!showPlayer) return null;

  if (loading) {
    return (
      <Card className="p-4 mb-6">
        <div className="flex items-center space-x-3 mb-2">
          <Music className="h-5 w-5 text-green-500" />
          <h3 className="font-medium">Currently Playing</h3>
        </div>
        <div className="flex items-center space-x-3">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="flex-1">
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Column fillWidth padding="12" radius="l" border="neutral-medium" gap="12">
        <div className="flex items-center space-x-3 mb-2">
          <Icon name="chevronRight" onBackground="success-weak"/>
          <Heading as="h3" variant="heading-strong-l">
            Currently Playing
          </Heading>
        </div>
        <div className="text-sm text-muted-foreground mb-2">
          Could not load Spotify data: {error}
        </div>
        <Button 
          variant="secondary"
          onClick={refreshTrack} 
          disabled={refreshing}
          prefixIcon={refreshing ? "refresh" : undefined}
          fillWidth
        >
          {refreshing ? (
            <>
              Refreshing...
            </>
          ) : (
            <>
              Try Again
            </>
          )}
        </Button>
      </Column>
    );
  }

  if (!track) {
    return (
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Music className="h-5 w-5 text-green-500" />
            <h3 className="font-medium">Spotify</h3>
          </div>
          <Button
            onClick={refreshTrack} 
            disabled={refreshing}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Not currently playing anything</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <Music className="h-5 w-5 text-green-500" />
          <h3 className="font-medium">Currently Playing on Spotify</h3>
        </div>
        <IconButton 
          variant="secondary"
          onClick={refreshTrack} 
          disabled={refreshing}
          name="refresh"
        />
      </div>
      
      <div className="flex items-center space-x-3">
        <div className="relative group">
          <img 
            src={track.album_art} 
            alt={`${track.album} album cover`} 
            className="h-16 w-16 rounded-md object-cover"
          />
          
          {track.preview_url && (
            <button 
              onClick={togglePlay}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md"
            >
              {isPlaying ? (
                <Pause className="h-8 w-8 text-white" />
              ) : (
                <Play className="h-8 w-8 text-white" />
              )}
            </button>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{track.name}</p>
          <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
          <p className="text-xs text-muted-foreground truncate">{track.album}</p>
          
          <a 
            href={track.external_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-green-500 hover:underline flex items-center mt-1 w-fit"
          >
            Open in Spotify
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </div>
      </div>
      
      {track.preview_url && isPlaying && (
        <div className="flex items-center space-x-2 mt-2 text-xs text-muted-foreground">
          <Volume2 className="h-3 w-3" />
          <span>Preview playing</span>
        </div>
      )}
    </Card>
  );
}

