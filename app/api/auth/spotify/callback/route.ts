import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const state = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  console.log('Callback received with params:', { 
    code: code ? 'present' : 'missing',
    state: state || 'missing',
    error: error || 'none'
  });

  // If there's an error from Spotify, redirect with error
  if (error) {
    console.error('Spotify auth error:', error);
    return NextResponse.redirect(new URL(`/settings?error=${error}`, requestUrl.origin));
  }

  // Check for state parameter
  if (!state) {
    console.error('Missing state parameter from Spotify');
    return NextResponse.redirect(new URL('/settings?error=spotify_missing_state_param', requestUrl.origin));
  }

  // Check for code parameter
  if (!code) {
    console.error('Missing code parameter from Spotify');
    return NextResponse.redirect(new URL('/settings?error=spotify_missing_code_param', requestUrl.origin));
  }

  // Get the stored state and user ID from cookies
  const cookieStore = cookies();
  const storedState = cookieStore.get('spotify_auth_state')?.value;
  const userId = cookieStore.get('spotify_auth_user_id')?.value;

  // Verify state to prevent CSRF attacks
  if (state !== storedState) {
    console.error('State mismatch:', { received: state, stored: storedState });
    return NextResponse.redirect(new URL('/settings?error=spotify_state_mismatch', requestUrl.origin));
  }

  if (!userId) {
    console.error('No user ID found in cookies');
    return NextResponse.redirect(new URL('/settings?error=spotify_missing_user_id', requestUrl.origin));
  }

  try {
    // Exchange code for access token with Spotify API
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
      }).toString()
    });

    // Add more detailed logging for debugging
    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Spotify token exchange error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText,
        clientIdExists: !!process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
        clientSecretExists: !!process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`
      });
      return NextResponse.redirect(new URL(`/settings?error=spotify_token_exchange&details=${encodeURIComponent(errorText)}`, requestUrl.origin));
    }
    
    const tokenData = await tokenResponse.json();
    console.log('Received token data from Spotify:', {
      access_token: tokenData.access_token ? 'present' : 'missing',
      refresh_token: tokenData.refresh_token ? 'present' : 'missing',
      expires_in: tokenData.expires_in
    });
    
    // Get user profile from Spotify
    const profileResponse = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    if (!profileResponse.ok) {
      console.error('Failed to fetch Spotify profile:', profileResponse.status);
      return NextResponse.redirect(new URL('/settings?error=spotify_profile_fetch', requestUrl.origin));
    }
    
    const profileData = await profileResponse.json();
    console.log('Received profile data from Spotify:', profileData.display_name);
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Store the integration in the database
    const { error } = await supabase
      .from('integrations')
      .upsert({
        user_id: userId,
        platform: 'spotify',
        platform_username: profileData.display_name,
        profile_url: profileData.external_urls?.spotify,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        display_on_profile: true,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error storing Spotify integration:', error);
      return NextResponse.redirect(new URL(`/settings?error=spotify_db_error&details=${encodeURIComponent(error.message)}`, requestUrl.origin));
    }
    
    console.log('Successfully created Spotify integration');
    
    // Clear the auth cookies
    const response = NextResponse.redirect(new URL('/settings?success=spotify_connected', requestUrl.origin));
    response.cookies.delete('spotify_auth_state');
    response.cookies.delete('spotify_auth_user_id');
    
    return response;
  } catch (error) {
    console.error('Error processing Spotify callback:', error);
    return NextResponse.redirect(new URL(`/settings?error=spotify_unexpected&details=${encodeURIComponent((error as Error).message)}`, requestUrl.origin));
  }
}

// Add POST handler for code exchange
export async function POST(request: Request) {
  try {
    const { code, state, userId } = await request.json();
    
    console.log('Processing code exchange:', { 
      hasCode: !!code, 
      hasState: !!state,
      userId: userId || 'missing'
    });
    
    if (!code || !state || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }
    
    // Initialize Supabase client
    const supabase = createRouteHandlerClient({ cookies });
    
    // Exchange code for access token with Spotify API
    // This is a placeholder for the actual API call
    try {
      // Make the API call to Spotify to exchange the code for tokens
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(
            `${process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
          ).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/spotify/callback`,
        }).toString()
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error('Spotify token exchange error:', response.status, errorData);
        return NextResponse.json({ 
          success: false, 
          error: `Spotify API error: ${response.status}` 
        }, { status: 500 });
      }
      
      const tokenData = await response.json();
      console.log('Received token data from Spotify');
      
      // Get user profile from Spotify
      const profileResponse = await fetch('https://api.spotify.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      if (!profileResponse.ok) {
        console.error('Failed to fetch Spotify profile:', profileResponse.status);
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to fetch Spotify profile' 
        }, { status: 500 });
      }
      
      const profileData = await profileResponse.json();
      console.log('Received profile data from Spotify:', profileData.display_name);
      
      // Store the integration in the database
      const { data, error } = await supabase
        .from('integrations')
        .insert({
          user_id: userId,
          platform: 'spotify',
          platform_username: profileData.display_name,
          profile_url: profileData.external_urls?.spotify,
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
          display_on_profile: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) {
        console.error('Error storing Spotify integration:', error);
        return NextResponse.json({ 
          success: false, 
          error: `Database error: ${error.message}` 
        }, { status: 500 });
      }
      
      console.log('Successfully created Spotify integration');
      
      return NextResponse.json({ 
        success: true, 
        message: 'Spotify account connected successfully' 
      });
      
    } catch (error) {
      console.error('Error during Spotify token exchange:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Token exchange error: ${(error as Error).message}` 
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json({ 
      success: false, 
      error: `Server error: ${(error as Error).message}` 
    }, { status: 500 });
  }
}
