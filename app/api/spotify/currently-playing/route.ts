import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });
  
  try {
    // Get the Spotify integration for the user
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'spotify')
      .single();
    
    if (integrationError || !integration) {
      return NextResponse.json({ error: 'Spotify integration not found' }, { status: 404 });
    }
    
    if (!integration.display_on_profile) {
      return NextResponse.json({ error: 'Spotify integration is not displayed on profile' }, { status: 403 });
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const tokenExpiresAt = new Date(integration.token_expires_at);
    let accessToken = integration.access_token;
    
    if (now >= tokenExpiresAt) {
      // Token is expired, refresh it
      const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: integration.refresh_token,
        }),
      });

      if (!refreshResponse.ok) {
        return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
      }

      const refreshData = await refreshResponse.json();
      accessToken = refreshData.access_token;
      
      // Update the token in the database
      await supabase
        .from('integrations')
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || integration.refresh_token,
          token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq('user_id', userId)
        .eq('platform', 'spotify');
    }

    // Get currently playing track from Spotify
    const currentlyPlayingResponse = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // If no track is playing (204 No Content)
    if (currentlyPlayingResponse.status === 204) {
      return NextResponse.json({ isPlaying: false });
    }

    if (!currentlyPlayingResponse.ok) {
      return NextResponse.json({ error: 'Failed to get currently playing track' }, { status: 500 });
    }

    const currentlyPlayingData = await currentlyPlayingResponse.json();
    
    // If no track is playing
    if (!currentlyPlayingData.is_playing || !currentlyPlayingData.item) {
      return NextResponse.json({ isPlaying: false });
    }

    const track = currentlyPlayingData.item;
    
    // Store the currently playing track in the database
    await supabase
      .from('spotify_currently_playing')
      .upsert({
        user_id: userId,
        track_id: track.id,
        track_name: track.name,
        artist_name: track.artists.map((artist: any) => artist.name).join(', '),
        album_name: track.album.name,
        album_art_url: track.album.images[0]?.url,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify,
        updated_at: new Date().toISOString()
      });

    // Return the track data
    return NextResponse.json({
      isPlaying: true,
      track: {
        id: track.id,
        name: track.name,
        artist: track.artists.map((artist: any) => artist.name).join(', '),
        album: track.album.name,
        album_art: track.album.images[0]?.url,
        preview_url: track.preview_url,
        external_url: track.external_urls.spotify
      }
    });
  } catch (error) {
    console.error('Error fetching currently playing track:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}