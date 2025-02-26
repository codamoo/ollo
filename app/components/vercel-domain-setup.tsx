
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface VercelDomainSetupProps {
  domain: string;
  onSetupComplete?: () => void;
}

export default function VercelDomainSetup({ domain, onSetupComplete }: VercelDomainSetupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);
  const [setupComplete, setSetupComplete] = useState(false);
  
  const addDomainToVercel = async () => {
    if (!domain) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/domains/add-to-vercel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain }),
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setVerificationDetails(result.verificationDetails);
        setSetupComplete(true);
        toast.success('Domain added to Vercel successfully');
        if (onSetupComplete) {
          onSetupComplete();
        }
      } else {
        setError(result.message || 'Failed to add domain to Vercel');
        toast.error(result.message || 'Failed to add domain to Vercel');
      }
    } catch (err) {
      console.error('Error adding domain to Vercel:', err);
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Domain to Vercel</CardTitle>
        <CardDescription>
          Automatically configure your domain {domain} with Vercel
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {setupComplete && verificationDetails && (
          <div className="space-y-4">
            <Alert variant="default" className="mb-4 bg-green-50 border border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Domain Added Successfully</AlertTitle>
              <AlertDescription className="text-green-700">
                Your domain has been added to Vercel. Please configure your DNS settings to complete the setup.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Required DNS Records:</h3>
              {verificationDetails.verification?.map((record: any, index: number) => (
                <div key={index} className="p-3 bg-gray-50 rounded-md flex justify-between items-center">
                  <div>
                    <p className="text-sm font-mono">{record.type} {record.name} {record.value}</p>
                    <p className="text-xs text-gray-500">{record.reason}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleCopy(`${record.type} ${record.name} ${record.value}`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {!setupComplete && (
          <p className="text-sm text-gray-600 mb-4">
            This will automatically add your domain to your Vercel project and provide you with the necessary DNS configuration.
          </p>
        )}
      </CardContent>
      <CardFooter>
        {!setupComplete && (
          <Button 
            onClick={addDomainToVercel} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? 'Adding Domain...' : 'Add Domain to Vercel'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
