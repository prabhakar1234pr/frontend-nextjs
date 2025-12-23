/**
 * Shared TypeScript types for API requests and responses
 */

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

