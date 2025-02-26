import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res: response });
  
  // Check if we're already on the domain-verification page to prevent loops
  if (request.nextUrl.pathname === '/domain-verification') {
    return NextResponse.next();
  }

  // Check if we're in a potential redirect loop
  const redirectCount = parseInt(request.headers.get('x-redirect-count') || '0');
  if (redirectCount > 5) {
    console.error('Detected redirect loop, breaking out');
    return NextResponse.next();
  }

  // Skip middleware for API routes and Next.js resources
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/static')
  ) {
    return response;
  }

  // Check if the request is for a custom domain
  const hostname = request.headers.get('host')?.toLowerCase().trim();
  console.log('Raw hostname:', request.headers.get('host'), 'Processed hostname:', hostname);

  // Add your specific domain to the isMainDomain check if needed
  const isMainDomain = hostname === 'ollo.bio' || 
                       hostname?.includes('localhost') || 
                       hostname?.includes('vercel.app');
  
  console.log('Middleware processing hostname:', hostname, 'isMainDomain:', isMainDomain);
  
  if (!isMainDomain) {
    // Query the database for a profile with this custom domain
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, domain_verified')
      .eq('custom_domain', hostname)
      .single();
    
    console.log('Custom domain lookup result:', { profile, error, hostname });
    
    if (profile && !error && profile.domain_verified) {
      // Rewrite the URL to the profile page
      const url = request.nextUrl.clone();
      
      // Ensure username is valid
      if (!profile.username) {
        console.error('Username is missing for domain:', hostname);
        return response;
      }
      
      // Construct the path correctly
      url.pathname = `/${profile.username}${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`;
      console.log('Rewriting to:', url.pathname);
      
      // Use rewrite instead of redirect to maintain the original URL
      return NextResponse.rewrite(url);
    } else if (profile && !error && !profile.domain_verified) {
      // Domain exists but is not verified - redirect to verification page
      const url = new URL('/domain-verification', request.url);
      url.searchParams.set('domain', hostname || '');
      
      // Add a header to track redirect count to prevent loops
      const newResponse = NextResponse.redirect(url);
      newResponse.headers.set('x-redirect-count', (redirectCount + 1).toString());
      return newResponse;
    } else {
      console.log('No matching profile found for domain:', hostname);
    }
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
