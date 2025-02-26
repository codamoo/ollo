'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface CustomDomainCardProps {
  currentDomain?: string;
  onSave: (domain: string) => Promise<any>;
  onVerify?: (domain: string) => Promise<any>;
}

export default function CustomDomainCard({ 
  currentDomain = '', 
  onSave, 
  onVerify 
}: CustomDomainCardProps) {
  const [domain, setDomain] = useState(currentDomain);
  const [loading, setLoading] = useState(false);
  const [verificationDetails, setVerificationDetails] = useState<any>(null);

  const handleSaveDomain = async () => {
    if (!domain) return;
    
    setLoading(true);
    try {
      const result = await onSave(domain);
      
      if (result.success) {
        toast.success('Domain saved successfully');
        if (result.verificationDetails) {
          setVerificationDetails(result.verificationDetails);
        }
      } else {
        toast.error(result.message || 'Failed to save domain');
      }
    } catch (error) {
      console.error('Error saving domain:', error);
      toast.error('An error occurred while saving the domain');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    if (!domain || !onVerify) return;
    
    setLoading(true);
    try {
      const result = await onVerify(domain);
      
      if (result.success) {
        toast.success('Domain verified successfully');
        setVerificationDetails(null);
      } else {
        toast.error(result.message || 'Failed to verify domain');
      }
    } catch (error) {
      console.error('Error verifying domain:', error);
      toast.error('An error occurred while verifying the domain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="domain-card">
      <div className="domain-section">
        <h3 className="domain-section-title">Custom Domain</h3>
        <p className="text-sm mb-4">
          Connect your own domain to your profile page.
        </p>
        
        <div className="flex gap-2">
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="yourdomain.com"
            className="domain-input"
            disabled={loading}
          />
          <button
            onClick={handleSaveDomain}
            disabled={!domain || loading}
            className="domain-button"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
      
      {verificationDetails && (
        <div className="domain-section">
          <h4 className="domain-section-title">Domain Verification</h4>
          <p className="text-sm mb-2">
            Please add the following DNS records to verify your domain:
          </p>
          
          {verificationDetails.verification && verificationDetails.verification.map((item: any, index: number) => (
            <div key={index} className="domain-verification-item">
              <div className="flex justify-between mb-1">
                <span className="font-medium">Type:</span>
                <span>{item.type}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Name:</span>
                <span>{item.name}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="font-medium">Value:</span>
                <span className="break-all">{item.value}</span>
              </div>
            </div>
          ))}
          
          {onVerify && (
            <button
              onClick={handleVerifyDomain}
              disabled={loading}
              className="domain-button mt-2"
            >
              {loading ? 'Verifying...' : 'Verify Domain'}
            </button>
          )}
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mt-4">
        Note: After adding your domain, it may take up to 24 hours for DNS changes to propagate.
      </div>
    </div>
  );
}