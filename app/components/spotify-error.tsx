'use client';

import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function SpotifyError() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const details = searchParams.get('details');
  
  // Map error codes to user-friendly messages
  const errorMessages: Record<string, string> = {
    spotify_auth_failed: 'Spotify authentication failed. Please try again.',
    spotify_missing_state_param: 'Security verification failed. Please try connecting again.',
    spotify_missing_state_cookie: 'Your browser may be blocking cookies needed for authentication.',
    spotify_state_mismatch: 'Security verification failed. Please try connecting again.',
    spotify_no_user_id: 'User identification failed. Please log out and log back in.',
    spotify_no_code: 'No authorization code received from Spotify.',
    spotify_token_exchange: 'Failed to exchange authorization code for access token. This could be due to a configuration issue.',
    spotify_missing_code_param: 'Missing code parameter from Spotify.',
    spotify_missing_user_id: 'No user ID found in cookies.',
    spotify_profile_fetch: 'Failed to fetch Spotify profile information.',
    spotify_db_error: 'Failed to store Spotify integration in the database.',
    spotify_unexpected: 'An unexpected error occurred during Spotify connection.',
    default: 'An error occurred while connecting to Spotify.'
  };
  
  const errorMessage = error ? (errorMessages[error] || errorMessages.default) : null;
  
  if (!errorMessage) return null;
  
  return (
    <Card className="p-4 mb-4 border-destructive">
      <div className="flex items-start">
        <AlertCircle className="h-5 w-5 text-destructive mr-2 mt-0.5" />
        <div>
          <p className="font-medium text-destructive">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Error code: {error}
          </p>
          {details && (
            <p className="text-xs text-muted-foreground mt-1 break-all">
              Details: {details}
            </p>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => router.push('/api/auth/spotify')}
          >
            Try Again
          </Button>
        </div>
      </div>
    </Card>
  );
}
