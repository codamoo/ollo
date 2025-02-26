import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const userId = requestUrl.searchParams.get('userId');
  
  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }
  
  // Generate a random state value for security
  const state = randomBytes(16).toString('hex');
  
  // Get the base URL from environment or request
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                 `${requestUrl.protocol}//${requestUrl.host}`;
  const redirectUri = `${baseUrl}/api/auth/spotify/callback`;
  
  // Log environment variables for debugging
  console.log('Spotify OAuth configuration:');
  console.log('- Client ID:', process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID || 'missing');
  console.log('- Redirect URI:', redirectUri);
  console.log('- Client Secret exists:', !!process.env.SPOTIFY_CLIENT_SECRET);
  
  try {
    // Create the authorization URL
    const authUrl = buildSpotifyAuthUrl(
      state, 
      process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID, 
      redirectUri
    );
    
    // Create the response object
    const response = NextResponse.json({ 
      success: true,
      authorizationUrl: authUrl
    });
    
    // Set cookies on the response object
    response.cookies.set('spotify_auth_state', state, { 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
      sameSite: 'lax'
    });

    response.cookies.set('spotify_auth_user_id', userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10, // 10 minutes
      path: '/',
      sameSite: 'lax'
    });

    console.log('Setting Spotify auth state:', state);
    console.log('User ID for Spotify auth:', userId);
    
    return response;
  } catch (error) {
    console.error('Error creating Spotify auth URL:', error);
    return NextResponse.json({ 
      error: `Failed to create Spotify authorization URL: ${(error as Error).message}` 
    }, { status: 500 });
  }
}

// Helper function to build the Spotify authorization URL
function buildSpotifyAuthUrl(state: string, clientId: string | undefined, redirectUri: string | undefined) {
  if (!clientId || !redirectUri) {
    throw new Error('Missing Spotify client ID or redirect URI');
  }
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'user-read-private user-read-email user-read-currently-playing user-read-playback-state',
    redirect_uri: redirectUri,
    state: state
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}
