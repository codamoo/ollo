import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { checkVercelDomainStatus } from '../../../../app/lib/vercel-api';

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
    
    // Check domain status in Vercel
    const status = await checkVercelDomainStatus(domain);
    
    return NextResponse.json({ 
      success: true, 
      status
    });
    
  } catch (error) {
    console.error('Error checking Vercel domain status:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'An error occurred while checking domain status' 
    }, { status: 500 });
  }
}
