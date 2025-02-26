import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get the token and refresh token from the request body
    const { token, refresh_token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 400 });
    }
    
    // Log the current cookies for debugging
    console.log('Cookies before setting session:', cookieStore.getAll().map(c => c.name));
    
    // Set the auth cookie manually with both tokens
    const { data, error } = await supabase.auth.setSession({ 
      access_token: token,
      refresh_token: refresh_token || '' // Use provided refresh token or empty string
    });
    
    if (error) {
      console.error('Error setting session:', error);
      return NextResponse.json({ 
        error: error.message,
        details: error
      }, { status: 401 });
    }
    
    // Get the session to confirm it worked
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session after setting:', sessionError);
      return NextResponse.json({ 
        error: 'Failed to verify session after setting',
        details: sessionError
      }, { status: 500 });
    }
    
    // Log the cookies after setting session
    console.log('Cookies after setting session:', cookieStore.getAll().map(c => c.name));
    
    return NextResponse.json({
      success: !!session,
      authenticated: !!session,
      userId: session?.user?.id,
      sessionData: session ? {
        expires_at: session.expires_at,
        token_type: session.token_type
      } : null
    });
  } catch (error) {
    console.error('Server error syncing authentication:', error);
    return NextResponse.json({
      error: 'Server error syncing authentication',
      details: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}
