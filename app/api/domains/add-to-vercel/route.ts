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
      
    if (profileError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Error fetching user profile',
        error: profileError
      }, { status: 500 });
    }
    
    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        message: 'User profile not found'
      }, { status: 404 });
    }
    
    if (profile.custom_domain !== domain) {
      return NextResponse.json({ 
        success: false, 
        message: 'Domain not associated with your account',
        expected: profile.custom_domain,
        received: domain
      }, { status: 403 });
    }
    
    // Get Vercel API credentials from environment variables
    const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
    const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
    
    // Debug environment variables (don't include this in production)
    console.log('Vercel API Config:', {
      tokenExists: !!VERCEL_AUTH_TOKEN,
      tokenLength: VERCEL_AUTH_TOKEN ? VERCEL_AUTH_TOKEN.length : 0,
      projectId: VERCEL_PROJECT_ID
    });
    
    if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
      return NextResponse.json({ 
        success: false, 
        message: 'Vercel API configuration is missing' 
      }, { status: 500 });
    }
    
    // Prepare API request parameters
    const apiUrl = `${VERCEL_API_URL}/v9/projects/${VERCEL_PROJECT_ID}/domains`;
    
    console.log('Making Vercel API request to:', apiUrl);
    
    // Add domain to Vercel
    const vercelResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: domain })
    });
    
    const vercelData = await vercelResponse.json();
    
    console.log('Vercel API response:', {
      status: vercelResponse.status,
      data: vercelData
    });
    
    if (!vercelResponse.ok) {
      console.error('Vercel API error:', vercelData);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to add domain to Vercel',
        error: vercelData
      }, { status: vercelResponse.status });
    }
    
    // Return success with verification details
    return NextResponse.json({ 
      success: true, 
      message: 'Domain added to Vercel successfully',
      verificationDetails: vercelData
    });
    
  } catch (error) {
    console.error('Error adding domain to Vercel:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while adding domain to Vercel',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
