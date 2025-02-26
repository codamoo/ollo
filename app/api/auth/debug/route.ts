import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Get all cookies for debugging
    const allCookies = cookieStore.getAll().map(c => `${c.name}: ${c.value.substring(0, 10)}...`);
    
    // Get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    return NextResponse.json({
      authenticated: !!session,
      sessionError: sessionError?.message || null,
      userId: session?.user?.id || null,
      cookiesPresent: allCookies,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Server error checking authentication',
      details: (error as Error).message
    }, { status: 500 });
  }
}