/**
 * Shared TypeScript types for API requests and responses
 */

/**
 * Project API Types
 */
export interface CreateProjectData {
  github_url: string
  skill_level: 'beginner' | 'intermediate' | 'advanced'
  target_days: number
}

export interface Project {
  project_id: string
  project_name: string
  github_url: string  // Original learning repository (source of truth for curriculum)
  skill_level: string
  target_days: number
  status: 'created' | 'processing' | 'ready' | 'failed'
  created_at: string
  updated_at?: string
  generation_progress?: number
  error_message?: string | null
  // GitHub integration fields (project-level)
  user_repo_url?: string  // User's repository created in Day 0 Task 2
  user_repo_first_commit?: string  // First commit SHA from Day 0 Task 3
  github_access_token?: string  // Encrypted PAT (not returned to frontend)
  github_username?: string  // GitHub username for this project
  github_consent_accepted?: boolean  // Whether user consented to auto-reset
  github_consent_timestamp?: string  // When consent was given
}

