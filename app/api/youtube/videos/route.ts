
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

async function getChannelId(username: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=id&forUsername=${username}&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch channel ID');
    }
    
    const data = await response.json();
    return data.items?.[0]?.id || null;
  } catch (error) {
    console.error('Error fetching channel ID:', error);
    return null;
  }
}

function extractChannelIdentifier(url: string): { type: 'id' | 'username' | 'handle', value: string } | null {
  // Handle channel ID format
  let match = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
  if (match) return { type: 'id', value: match[1] };

  // Handle username format
  match = url.match(/youtube\.com\/user\/([^\/\?]+)/);
  if (match) return { type: 'username', value: match[1] };

  // Handle new handle format
  match = url.match(/youtube\.com\/@([^\/\?]+)/);
  if (match) return { type: 'handle', value: match[1] };

  // Handle short youtube.com/c/ format
  match = url.match(/youtube\.com\/c\/([^\/\?]+)/);
  if (match) return { type: 'username', value: match[1] };

  return null;
}

export async function GET(request: Request) {
  if (!process.env.YOUTUBE_API_KEY) {
    console.error('YouTube API key is not configured');
    return NextResponse.json({ 
      error: 'YouTube integration is not properly configured' 
    }, { status: 500 });
  }

  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    const { data: socialLink, error: socialLinkError } = await supabase
      .from('social_links')
      .select('url')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .single();

    if (socialLinkError || !socialLink) {
      return NextResponse.json({ 
        error: 'YouTube integration not found' 
      }, { status: 404 });
    }

    const channelInfo = extractChannelIdentifier(socialLink.url);
    if (!channelInfo) {
      return NextResponse.json({ 
        error: 'Invalid YouTube URL format' 
      }, { status: 400 });
    }

    let channelId: string | null = null;

    if (channelInfo.type === 'id') {
      channelId = channelInfo.value;
    } else {
      // For handles and usernames, we need to fetch the channel ID
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${channelInfo.value}&key=${process.env.YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('YouTube API error:', error);
        throw new Error(error.error?.message || 'Failed to fetch channel information');
      }

      const data = await response.json();
      channelId = data.items?.[0]?.id?.channelId;
    }

    if (!channelId) {
      return NextResponse.json({ 
        error: 'Could not find YouTube channel' 
      }, { status: 404 });
    }

    // Fetch videos using the channel ID
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?` + 
      new URLSearchParams({
        part: 'snippet',
        channelId: channelId,
        order: 'date',
        type: 'video',
        maxResults: '10',
        key: process.env.YOUTUBE_API_KEY
      }),
      { next: { revalidate: 3600 } }
    );

    if (!videosResponse.ok) {
      const error = await videosResponse.json();
      console.error('YouTube API error:', error);
      throw new Error(error.error?.message || 'Failed to fetch videos');
    }

    const videosData = await videosResponse.json();

    const videos = videosData.items.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
      published_at: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching YouTube videos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch YouTube videos' },
      { status: 500 }
    );
  }
}
