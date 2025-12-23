import { auth } from '@clerk/nextjs/server'

/**
 * Get authentication headers with Clerk token (server-side)
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { getToken } = await auth()
  const token = await getToken()
  
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

