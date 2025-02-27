import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Get the current integration
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', 'spotify')
      .single();

    if (integrationError || !integration) {
      return NextResponse.json({ error: 'No Spotify integration found' }, { status: 404 });
    }

    // Refresh the token
    const refreshResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: integration.refresh_token,
      }),
    });

    if (!refreshResponse.ok) {
      // If refresh fails, mark integration as disconnected
      await supabase
        .from('integrations')
        .update({
          connected: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('platform', 'spotify');

      return NextResponse.json(
        { error: 'Failed to refresh Spotify token' },
        { status: refreshResponse.status }
      );
    }

    const refreshData = await refreshResponse.json();

    // Update the integration with new tokens
    await supabase
      .from('integrations')
      .update({
        access_token: refreshData.access_token,
        refresh_token: refreshData.refresh_token || integration.refresh_token,
        token_expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        connected: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('platform', 'spotify');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in refresh route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



