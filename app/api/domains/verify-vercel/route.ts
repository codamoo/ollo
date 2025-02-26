import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// Vercel API endpoints
const VERCEL_API_URL = 'https://api.vercel.com';

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();
    
    if (!domain) {
      return NextResponse.json({ 
        success: false, 
        message: 'Domain is required' 
      }, { status: 400 });
    }
    
    // Get the current user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Check if the domain belongs to the user
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, custom_domain')
      .eq('id', user.id)
      .single();
      
    if (profileError || !profile || profile.custom_domain !== domain) {
      return NextResponse.json({ 
        success: false, 
        message: 'Domain not found or not associated with your account' 
      }, { status: 403 });
    }
    
    // Get Vercel API credentials from environment variables
    const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
    const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vercel API configuration is missing' 
      }, { status: 500 });
    }
    
    // Prepare API request parameters
    const apiUrl = `${VERCEL_API_URL}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}/verify`;
    const queryParams = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
    
    // Trigger domain verification in Vercel
    const vercelResponse = await fetch(`${apiUrl}${queryParams}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const vercelData = await vercelResponse.json();
    
    if (!vercelResponse.ok) {
      console.error('Vercel API error:', vercelData);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to verify domain with Vercel',
        error: vercelData
      }, { status: vercelResponse.status });
    }
    
    // Return success with verification status
    return NextResponse.json({ 
      success: true, 
      message: 'Domain verification triggered',
      status: vercelData
    });
    
  } catch (error) {
    console.error('Error verifying domain with Vercel:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred during domain verification' 
    }, { status: 500 });
  }
}