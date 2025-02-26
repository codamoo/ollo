import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();
    
    if (!domain) {
      return NextResponse.json({ 
        verified: false, 
        message: 'Domain is required' 
      }, { status: 400 });
    }
    
    // Get the current user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ 
        verified: false, 
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
        verified: false, 
        message: 'Domain not found or not associated with your account' 
      }, { status: 403 });
    }
    
    // Verify the CNAME record
    // Modify your verification logic to handle www subdomains
    const domainToCheck = domain.startsWith('www.') ? domain : domain;
    const rootDomain = domain.startsWith('www.') ? domain.substring(4) : domain;

    // Try to resolve CNAME for the provided domain
    try {
      console.log(`Attempting to resolve CNAME for domain: ${domainToCheck}`);
      const cnameRecords = await resolveCname(domainToCheck);
      console.log(`CNAME records found:`, cnameRecords);
      
      const expectedCname = 'profiles.ollo.bio';
      
      const isVerified = cnameRecords.some(record => 
        record === expectedCname || record.endsWith(`.${expectedCname}`)
      );
      
      if (isVerified) {
        // Update the domain verification status
        await supabase
          .from('profiles')
          .update({ domain_verified: true })
          .eq('id', user.id);
          
        return NextResponse.json({ 
          verified: true, 
          message: 'Domain verified successfully' 
        });
      } else {
        return NextResponse.json({ 
          verified: false, 
          message: 'CNAME record does not match the expected value',
          expected: expectedCname,
          found: cnameRecords
        });
      }
    } catch (dnsError) {
      console.error('DNS resolution error:', dnsError);
      
      // Provide more detailed error information
      let errorMessage = 'Could not resolve CNAME record. Please check your DNS settings and try again.';
      let errorDetails = {};
      
      if (dnsError instanceof Error) {
        // Extract more specific error information
        if (dnsError.message.includes('ENOTFOUND')) {
          errorMessage = 'Domain not found. Please check that your domain is registered and active.';
        } else if (dnsError.message.includes('ENODATA') || dnsError.message.includes('queryTxt ENODATA')) {
          errorMessage = 'No CNAME record found for this domain. Please add the required CNAME record.';
        }
        
        errorDetails = {
          code: dnsError.name,
          details: dnsError.message
        };
      }
      
      return NextResponse.json({ 
        verified: false, 
        message: errorMessage,
        error: errorDetails
      });
    }
  } catch (error) {
    console.error('Domain verification error:', error);
    return NextResponse.json({ 
      verified: false, 
      message: 'An error occurred during domain verification' 
    }, { status: 500 });
  }
}
