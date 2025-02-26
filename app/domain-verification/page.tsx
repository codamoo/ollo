'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import DomainVerification from '@/components/domain-verification';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Globe } from 'lucide-react';
import Link from 'next/link';

export default function DomainVerificationPage() {
  const searchParams = useSearchParams();
  const domain = searchParams.get('domain');
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createClientComponentClient();
  
  useEffect(() => {
    const fetchDomainInfo = async () => {
      if (!domain) {
        setError('No domain specified');
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url, custom_domain, domain_verified')
          .eq('custom_domain', domain)
          .single();
          
        if (error) {
          setError('Domain not found');
        } else {
          setProfileData(data);
        }
      } catch (err) {
        console.error('Error fetching domain info:', err);
        setError('Failed to load domain information');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDomainInfo();
  }, [domain, supabase]);
  
  const handleVerificationComplete = () => {
    // Reload the page to show the verified status
    window.location.reload();
  };
  
  return (
    <div className="container max-w-3xl py-10">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to main site
      </Link>
      
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-3">
            <Globe className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Domain Verification</CardTitle>
          </div>
          <CardDescription>
            Verify your custom domain to connect it to your profile
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="py-8 text-center">Loading domain information...</div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">Domain Information</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This domain is registered to the profile: <span className="font-medium">{profileData.display_name || profileData.username}</span>
                </p>
              </div>
              
              {profileData.domain_verified ? (
                <div className="bg-green-50 border border-green-200 rounded-md p-4 text-green-800">
                  <div className="flex items-center">
                    <Globe className="h-5 w-5 text-green-600 mr-2" />
                    <p className="font-medium">Domain is verified and active</p>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Your domain is properly configured and pointing to your profile.
                  </p>
                  <div className="mt-4">
                    <Button asChild>
                      <Link href={`/${profileData.username}`}>
                        Visit Your Profile
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <DomainVerification 
                  domain={domain} 
                  onVerificationComplete={handleVerificationComplete} 
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}