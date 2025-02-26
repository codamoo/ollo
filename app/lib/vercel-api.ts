/**
 * Utility functions for interacting with the Vercel API
 */

// Vercel API endpoints
const VERCEL_API_URL = 'https://api.vercel.com';

/**
 * Check the verification status of a domain in Vercel
 */
export async function checkVercelDomainStatus(domain: string) {
  const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  
  if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error('Vercel API configuration is missing');
  }
  
  // Prepare API request parameters
  const apiUrl = `${VERCEL_API_URL}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
  const queryParams = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  
  // Get domain status from Vercel
  const response = await fetch(`${apiUrl}${queryParams}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    if (response.status === 404) {
      return { exists: false };
    }
    throw new Error(`Vercel API error: ${response.status}`);
  }
  
  const data = await response.json();
  return {
    exists: true,
    verified: data.verified,
    status: data.verification?.status,
    details: data
  };
}

/**
 * Delete a domain from Vercel
 */
export async function deleteVercelDomain(domain: string) {
  const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
  const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
  const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
  
  if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
    throw new Error('Vercel API configuration is missing');
  }
  
  // Prepare API request parameters
  const apiUrl = `${VERCEL_API_URL}/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}`;
  const queryParams = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : '';
  
  // Delete domain from Vercel
  const response = await fetch(`${apiUrl}${queryParams}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${VERCEL_AUTH_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete domain: ${response.status}`);
  }
  
  return { success: true };
}