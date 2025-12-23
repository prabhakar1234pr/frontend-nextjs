import { getAuthHeaders } from './api-auth'
import type { CreateProjectData } from './types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Create a new project (server-side)
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
 * Get project by ID (server-side)
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
 * List user's projects (server-side)
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

