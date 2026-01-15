/**
 * Git API Client
 * Functions for interacting with backend git endpoints.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface GitStatusResponse {
  success: boolean
  branch?: string | null
  ahead?: number
  behind?: number
  modified?: string[]
  staged?: string[]
  untracked?: string[]
  conflicts?: string[]
  raw?: string
}

export interface GitCommitEntry {
  sha: string
  author_name: string
  author_email: string
  date: string
  message: string
}

export interface GitCommitsResponse {
  success: boolean
  commits?: GitCommitEntry[]
}

export interface ExternalCommitsResponse {
  success: boolean
  has_external_commits?: boolean
  external_commits?: GitCommitEntry[]
  last_platform_commit?: string
  remote_commit?: string
}

export async function getGitStatus(workspaceId: string, token: string): Promise<GitStatusResponse> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to get git status' }))
    throw new Error(error.detail || 'Failed to get git status')
  }
  return res.json()
}

export async function getGitDiff(
  workspaceId: string,
  token: string,
  baseCommit?: string,
  headCommit?: string
): Promise<{ success: boolean; diff?: string }> {
  const params = new URLSearchParams()
  if (baseCommit) params.set('base_commit', baseCommit)
  if (headCommit) params.set('head_commit', headCommit)
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/diff?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to get diff' }))
    throw new Error(error.detail || 'Failed to get diff')
  }
  return res.json()
}

export async function commitChanges(
  workspaceId: string,
  token: string,
  message: string
): Promise<{ success: boolean; commit_sha?: string }> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/commit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to commit' }))
    throw new Error(error.detail || 'Failed to commit')
  }
  return res.json()
}

export async function pushToRemote(
  workspaceId: string,
  token: string,
  branch = 'main'
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/push`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to push' }))
    throw new Error(error.detail || 'Failed to push')
  }
  return res.json()
}

export async function pullFromRemote(
  workspaceId: string,
  token: string,
  branch = 'main',
  handleUncommitted?: 'commit' | 'stash' | 'discard'
): Promise<{ success: boolean; conflict?: 'uncommitted'; files?: string[]; message?: string }> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/pull`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ branch, handle_uncommitted: handleUncommitted }),
  })
  if (res.status === 409) {
    const error = await res.json().catch(() => ({ detail: { message: 'Uncommitted changes' } }))
    const detail = error.detail || {}
    return {
      success: false,
      conflict: 'uncommitted',
      files: detail.files || [],
      message: detail.message || 'Uncommitted changes detected',
    }
  }
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to pull' }))
    throw new Error(error.detail || 'Failed to pull')
  }
  return res.json()
}

export async function checkExternalCommits(
  workspaceId: string,
  token: string
): Promise<ExternalCommitsResponse> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/external-commits`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to check external commits' }))
    throw new Error(error.detail || 'Failed to check external commits')
  }
  return res.json()
}

export async function resetExternalCommits(
  workspaceId: string,
  token: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/reset-external`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ confirmed: true }),
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to reset external commits' }))
    throw new Error(error.detail || 'Failed to reset external commits')
  }
  return res.json()
}

export async function getCommits(
  workspaceId: string,
  token: string,
  rangeSpec?: string
): Promise<GitCommitsResponse> {
  const params = new URLSearchParams()
  if (rangeSpec) params.set('range_spec', rangeSpec)
  const res = await fetch(`${API_BASE}/api/git/${workspaceId}/commits?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to get commits' }))
    throw new Error(error.detail || 'Failed to get commits')
  }
  return res.json()
}
