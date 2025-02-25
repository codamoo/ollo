'use client';

import { Button } from './ui/button';
import { Card } from './ui/card';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-6 max-w-md w-full">
        <div className="flex flex-col items-center text-center">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-6">{message}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </Card>
    </div>
  );
}