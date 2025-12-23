/**
 * Barrel file - Re-exports all API functions and types for backward compatibility
 * 
 * This file maintains backward compatibility while the actual implementations
 * are organized in separate files:
 * - api-auth.ts: Authentication helpers
 * - api-users.ts: User-related API calls
 * - api-projects.ts: Project-related API calls (server-side)
 * - api-client.ts: Client-side project API calls
 * - types.ts: Shared TypeScript types
 */

// Re-export types
export type { CreateProjectData, Project } from './types'

// Re-export auth functions
export { getAuthHeaders } from './api-auth'

// Re-export user functions
export { syncUser, getCurrentUser } from './api-users'

// Re-export project functions (server-side)
export { createProject, getProject, listUserProjects } from './api-projects'