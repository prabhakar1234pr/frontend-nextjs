'use client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
 * Get auth headers using client-side Clerk hook
 */
export function getAuthHeadersClient(token: string | null): HeadersInit {
  if (!token) {
    throw new Error('No authentication token available')
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

/**
 * Create a new project (client-side)
 */
export async function createProjectClient(data: CreateProjectData, token: string | null) {
  try {
    if (!token) {
      throw new Error('Authentication required')
    }

    const headers = getAuthHeadersClient(token)
    
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

