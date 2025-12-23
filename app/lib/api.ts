import { auth } from '@clerk/nextjs/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Get authentication headers with Clerk token
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

/**
 * Sync user from Clerk to Supabase
 * Called automatically when user logs in
 */
export async function syncUser() {
  try {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_URL}/api/users/sync`, {
      method: 'POST',
      headers,
    })
    
    if (!response.ok) {
      let errorMessage = `Failed to sync user (${response.status})`
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to sync user:', error)
    throw error
  }
}

/**
 * Get current authenticated user from Supabase
 */
export async function getCurrentUser() {
  try {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      let errorMessage = `Failed to get user (${response.status})`
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to get user:', error)
    throw error
  }
}

/**
 * Project API Types
 */
export interface CreateProjectData {
  github_url: string
  skill_level: 'beginner' | 'intermediate' | 'expert'
  target_days: number
}

export interface Project {
  project_id: string
  project_name: string
  github_url: string
  skill_level: string
  target_days: number
  status: string
  created_at: string
  updated_at?: string
}

/**
 * Create a new project
 */
export async function createProject(data: CreateProjectData) {
  try {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_URL}/api/projects/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    })
    
    if (!response.ok) {
      let errorMessage = `Failed to create project (${response.status})`
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to create project:', error)
    throw error
  }
}

/**
 * Get project by ID
 */
export async function getProject(projectId: string) {
  try {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      let errorMessage = `Failed to get project (${response.status})`
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to get project:', error)
    throw error
  }
}

/**
 * List user's projects
 */
export async function listUserProjects() {
  try {
    const headers = await getAuthHeaders()
    
    const response = await fetch(`${API_URL}/api/projects/user/list`, {
      method: 'GET',
      headers,
    })
    
    if (!response.ok) {
      let errorMessage = `Failed to list projects (${response.status})`
      try {
        const error = await response.json()
        errorMessage = error.detail || error.message || errorMessage
      } catch {
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to list projects:', error)
    throw error
  }
}