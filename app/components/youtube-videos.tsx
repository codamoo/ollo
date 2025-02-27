'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Youtube, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface Video {
  id: string;
  video_id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  published_at: string;
}

interface YouTubeVideosProps {
  userId: string;
}

export default function YouTubeVideos({ userId }: YouTubeVideosProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVideos, setShowVideos] = useState(false);

  useEffect(() => {
    checkYouTubeIntegration();
  }, [userId]);

  const checkYouTubeIntegration = async () => {
    try {
      const { data: socialLink, error } = await supabase
        .from('social_links')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', 'youtube')
        .single();

      if (error) throw error;

      if (socialLink) {
        setShowVideos(true);
        fetchVideos();
      } else {
        setShowVideos(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking YouTube integration:', error);
      setShowVideos(false);
      setLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      setError(null);

      // First try to get cached videos from the database
      const { data: cachedVideos, error: cacheError } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('user_id', userId)
        .order('published_at', { ascending: false })
        .limit(10);

      if (cacheError) throw cacheError;

      if (cachedVideos && cachedVideos.length > 0) {
        setVideos(cachedVideos);
      }

      // Fetch fresh videos from the YouTube API
      const response = await fetch(`/api/youtube/videos?userId=${userId}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch YouTube videos');
      }

      const { videos: freshVideos } = await response.json();
      
      if (freshVideos && freshVideos.length > 0) {
        setVideos(freshVideos);
      }
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch YouTube videos');
      toast.error('Failed to fetch YouTube videos');
    } finally {
      setLoading(false);
    }
  };

  if (!showVideos) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Youtube className="h-5 w-5 text-red-600" />
          <h3 className="text-lg font-semibold">Latest Videos</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchVideos}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <div className="text-red-500 text-sm mb-4">
          {error}
        </div>
      )}

      {loading && videos.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Loading videos...
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {videos.map((video) => (
          <a
            key={video.video_id}
            href={`https://www.youtube.com/watch?v=${video.video_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <Card className="overflow-hidden">
              <div className="relative aspect-video">
                {/* Add error handling for images */}
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; // Prevent infinite loop
                    target.src = '/images/fallback-thumbnail.jpg'; // Add a fallback image
                  }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold line-clamp-2">{video.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {video.description}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  {new Date(video.published_at).toLocaleDateString()}
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {!loading && videos.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          No videos found
        </div>
      )}
    </Card>
  );
}
