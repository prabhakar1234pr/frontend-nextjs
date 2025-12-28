import { auth } from '@clerk/nextjs/server'

/**
 * Get authentication headers with Clerk token (server-side)
 * Includes timeout handling for Clerk service
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  try {
    // Add timeout wrapper for auth()
    const authPromise = auth()
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('Clerk service timeout')), 10000)
    )
    
    const authResult = await Promise.race([authPromise, timeoutPromise])
    const { getToken } = authResult
    
    // Add timeout wrapper for getToken()
    const tokenPromise = getToken()
    const tokenTimeoutPromise = new Promise<string | null>((_, reject) => 
      setTimeout(() => reject(new Error('Clerk token timeout')), 5000)
    )
    
    const token = await Promise.race([tokenPromise, tokenTimeoutPromise])
    
    if (!token) {
      throw new Error('No authentication token available')
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  } catch (error) {
    // If Clerk times out, throw a more descriptive error
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('Authentication service timeout. Please try again.')
    }
    throw error
  }
}

