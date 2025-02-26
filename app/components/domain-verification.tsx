'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Check, Copy, Globe, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import VercelDomainSetup from '../components/vercel-domain-setup';

interface DomainVerificationProps {
  domain: string | null;
  onVerificationComplete?: () => void;
}

export default function DomainVerification({ domain, onVerificationComplete }: DomainVerificationProps) {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'success' | 'failed'>('pending');
  const [verificationDetails, setVerificationDetails] = useState<{
    cnameRecord: string;
    cnameValue: string;
    cnameVerified: boolean;
  }>({
    cnameRecord: '@',
    cnameValue: 'profiles.ollo.bio',
    cnameVerified: false
  });
  const [selectedDnsProvider, setSelectedDnsProvider] = useState<string | null>(null);
  const [showDnsChecker, setShowDnsChecker] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'root' | 'www'>('root');
  const [alternativeAttempted, setAlternativeAttempted] = useState(false);
  const [verificationError, setVerificationError] = useState<any>(null);
  
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (domain) {
      checkVerificationStatus();
    }
  }, [domain]);

  const checkVerificationStatus = async () => {
    if (!domain) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('domain_verified')
        .eq('custom_domain', domain)
        .single();
        
      if (data && data.domain_verified) {
        setVerified(true);
        setVerificationStatus('success');
      }
    } catch (error) {
      console.error('Error checking domain verification status:', error);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const verifyDomain = async () => {
    if (!domain) return;
    
    setVerifying(true);
    setVerificationStatus('pending');
    
    try {
      const response = await fetch('/api/domains/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.verified) {
        setVerified(true);
        setVerificationStatus('success');
        setVerificationDetails({
          ...verificationDetails,
          cnameVerified: true
        });
        
        // Update the verification status in the database
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ domain_verified: true })
            .eq('id', user.id);
        }
        
        toast.success('Domain verified successfully!');
        if (onVerificationComplete) {
          onVerificationComplete();
        }
      } else {
        setVerificationStatus('failed');
        // Store the detailed error information
        setVerificationError(result);
        toast.error(result.message || 'Failed to verify domain');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      setVerificationStatus('failed');
      toast.error('Failed to verify domain');
    } finally {
      setVerifying(false);
    }
  };

  if (!domain) return null;

  return (
    <Card className="p-6 mt-4">
      <div className="flex items-center space-x-4 mb-4">
        <Globe className="h-6 w-6 text-blue-500" />
        <h3 className="text-lg font-medium">Domain Verification</h3>
      </div>
      
      {verified ? (
        <Alert className="bg-green-50 border-green-200 mb-4">
          <Check className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Domain Verified</AlertTitle>
          <AlertDescription className="text-green-700">
            Your domain {domain} is verified and active.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          <p>To verify your domain, add the following CNAME record to your DNS settings:</p>
          
          <div className="bg-muted p-4 rounded-md">
            <div className="flex justify-between items-center mb-2">
              <p className="font-medium">DNS Records</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => handleCopy(`Type: CNAME\nName: @\nValue: ${verificationDetails.cnameValue}\nTTL: 3600`)}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy All
              </Button>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground mb-1">
              <div>Type</div>
              <div>Name</div>
              <div>Value</div>
              <div>TTL</div>
            </div>
            
            <div className="grid grid-cols-4 gap-2 text-sm bg-background p-2 rounded-md">
              <div>CNAME</div>
              <div>{verificationDetails.cnameRecord}</div>
              <div className="truncate">{verificationDetails.cnameValue}</div>
              <div>3600</div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm text-blue-800">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
              <div>
                <p className="font-medium mb-1">Important DNS Information</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>DNS changes can take up to 48 hours to propagate globally.</li>
                  <li>For some DNS providers, you may need to use '@' or leave the host field empty for the root domain.</li>
                  <li>If you're using Cloudflare, make sure to set the proxy status to "DNS only" (gray cloud).</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm font-medium mb-2">Need help? Select your DNS provider for specific instructions:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {['Cloudflare', 'GoDaddy', 'Namecheap', 'Route53', 'DigitalOcean', 'Google Domains', 'Other'].map(provider => (
                <button
                  key={provider}
                  onClick={() => setSelectedDnsProvider(provider)}
                  className={`text-xs p-2 border rounded-md ${
                    selectedDnsProvider === provider 
                      ? 'bg-blue-100 border-blue-300' 
                      : 'bg-white border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
            
            {selectedDnsProvider && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
                <h4 className="font-medium text-blue-800 mb-2">{selectedDnsProvider} Instructions</h4>
                
                {selectedDnsProvider === 'Cloudflare' && (
                  <div className="text-blue-700 space-y-2">
                    <p>For Cloudflare, you cannot have both an A/AAAA record and a CNAME for the root domain:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Log in to your Cloudflare dashboard</li>
                      <li>Select your domain and go to the DNS tab</li>
                      <li>If you have an existing A or AAAA record for the root domain (@), you'll need to delete it first</li>
                      <li>Add a new CNAME record with Name: @ and Target: profiles.ollo.bio</li>
                      <li>Make sure the proxy status is set to "DNS only" (gray cloud)</li>
                      <li>Alternatively, use a www subdomain instead of the root domain</li>
                    </ol>
                  </div>
                )}
                
                {selectedDnsProvider === 'GoDaddy' && (
                  <div className="text-blue-700 space-y-2">
                    <p>For GoDaddy:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Log in to your GoDaddy account</li>
                      <li>Go to My Products > DNS</li>
                      <li>Find the CNAME section</li>
                      <li>Add a new record with Host: @ and Points to: profiles.ollo.bio</li>
                      <li>If you can't use @ for the root domain, try using a www subdomain instead</li>
                    </ol>
                  </div>
                )}
                
                {/* Add similar blocks for other providers */}
                
                {selectedDnsProvider === 'Other' && (
                  <div className="text-blue-700 space-y-2">
                    <p>General instructions:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Log in to your DNS provider's control panel</li>
                      <li>Find the DNS management section</li>
                      <li>Add a new CNAME record</li>
                      <li>For the root domain, use @ or leave the host field empty (depending on your provider)</li>
                      <li>Set the value/target to: profiles.ollo.bio</li>
                      <li>If you can't create a CNAME for the root domain, use www instead</li>
                      <li>Save your changes and wait for DNS propagation (up to 48 hours)</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {verificationStatus === 'failed' && !alternativeAttempted && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
              <h4 className="font-medium text-amber-800 mb-2">Try an alternative method</h4>
              <p className="text-sm text-amber-700 mb-3">
                Some DNS providers don't allow CNAME records on root domains. Would you like to try verifying with a www subdomain instead?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVerificationMethod(verificationMethod === 'root' ? 'www' : 'root');
                  setAlternativeAttempted(true);
                  setVerificationStatus('pending');
                }}
              >
                Try with {verificationMethod === 'root' ? 'www subdomain' : 'root domain'} instead
              </Button>
            </div>
          )}
          
          {verificationStatus === 'failed' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Verification Failed</AlertTitle>
              <AlertDescription>
                We couldn't verify your CNAME record. This could be because:
                <ul className="list-disc list-inside mt-2">
                  <li>DNS changes haven't propagated yet (can take up to 48 hours)</li>
                  <li>The CNAME record wasn't set up correctly</li>
                  <li>There's a conflict with existing DNS records</li>
                </ul>
                
                {verificationError && verificationError.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-xs">
                    <p><strong>Error details:</strong> {verificationError.message}</p>
                    {verificationError.error.details && (
                      <p className="mt-1 font-mono">{verificationError.error.details}</p>
                    )}
                    {verificationError.expected && (
                      <p className="mt-1">Expected: <span className="font-mono">{verificationError.expected}</span></p>
                    )}
                    {verificationError.found && (
                      <p className="mt-1">Found: <span className="font-mono">{JSON.stringify(verificationError.found)}</span></p>
                    )}
                  </div>
                )}
                
                Please check your DNS settings and try again later.
              </AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={verifyDomain} 
            disabled={verifying}
            className="w-full"
          >
            {verifying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verifying...
              </>
            ) : (
              'Verify Domain'
            )}
          </Button>

          <div className="mt-2 text-center">
            <button
              type="button"
              onClick={() => setShowDnsChecker(!showDnsChecker)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showDnsChecker ? 'Hide DNS checker' : 'Show DNS checker'}
            </button>
          </div>

          {showDnsChecker && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
              <h4 className="font-medium mb-2">DNS Checker</h4>
              <p className="text-sm text-gray-600 mb-3">
                Use these tools to check if your DNS records are properly configured:
              </p>
              <div className="space-y-2">
                <a 
                  href={`https://dnschecker.org/all-dns-records-of-domain.php?query=${domain}&rtype=CNAME&dns=google`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Check with DNSChecker.org
                </a>
                <a 
                  href={`https://mxtoolbox.com/SuperTool.aspx?action=cname%3a${domain}&run=toolpage`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Check with MXToolbox
                </a>
                <a 
                  href={`https://www.whatsmydns.net/#CNAME/${domain}`} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Check with WhatsMyDNS
                </a>
              </div>
            </div>
          )}
        </div>
      )}
      {verificationStatus === 'success' && (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Step 3: Add Domain to Vercel</h3>
          <VercelDomainSetup 
            domain={domain} 
            onSetupComplete={() => {
              toast.success('Domain setup with Vercel is complete');
            }} 
          />
        </div>
      )}
    </Card>
  );
}
