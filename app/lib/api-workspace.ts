/**
 * Workspace API Client
 * Functions for interacting with workspace file system and container management.
 */

// Use relative URLs to go through Next.js proxy (avoids mixed content issues)
// The proxy routes at /app/api/workspaces/[...path] forward to the VM
// If NEXT_PUBLIC_WORKSPACE_API_BASE_URL is set, use it directly (for direct VM access)
// Otherwise, use empty string to use Next.js proxy routes
const API_BASE = process.env.NEXT_PUBLIC_WORKSPACE_API_BASE_URL || "";

// Types

export interface FileItem {
  name: string;
  path: string;
  is_directory: boolean;
  size: number;
  permissions: string;
}

export interface ListFilesResponse {
  success: boolean;
  path: string;
  files: FileItem[];
}

export interface ReadFileResponse {
  success: boolean;
  path: string;
  content: string;
}

export interface WorkspaceInfo {
  workspace_id: string;
  user_id: string;
  project_id: string;
  container_id: string;
  container_status: string;
  created_at: string;
  last_active_at: string;
}

// Workspace Management

export async function createWorkspace(
  projectId: string,
  token: string
): Promise<{ success: boolean; workspace: WorkspaceInfo }> {
  const response = await fetch(`${API_BASE}/api/workspaces/create`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_id: projectId }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to create workspace" }));
    throw new Error(error.detail || "Failed to create workspace");
  }

  return response.json();
}

export async function getWorkspaceByProject(
  projectId: string,
  token: string
): Promise<{ success: boolean; workspace: WorkspaceInfo | null }> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/project/${projectId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (response.status === 404) {
    return { success: true, workspace: null };
  }

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to get workspace" }));
    throw new Error(error.detail || "Failed to get workspace");
  }

  return response.json();
}

export async function getOrCreateWorkspace(
  projectId: string,
  token: string
): Promise<WorkspaceInfo> {
  // Try to get existing workspace first
  const existing = await getWorkspaceByProject(projectId, token);

  if (existing.workspace) {
    // If container is not running, start it
    if (existing.workspace.container_status !== "running") {
      await startWorkspace(existing.workspace.workspace_id, token);
      // Refresh to get updated status
      const refreshed = await getWorkspaceByProject(projectId, token);
      if (refreshed.workspace) {
        // Always try to ensure repo is cloned when opening the workspace.
        // Never block workspace boot if cloning fails (repo might not be configured yet).
        try {
          await cloneWorkspaceRepo(refreshed.workspace.workspace_id, token);
        } catch (err) {
          console.warn("Workspace repo clone failed (non-fatal):", err);
        }
        return refreshed.workspace;
      }
    }
    // Always try to ensure repo is cloned when opening the workspace.
    // Never block workspace boot if cloning fails (repo might not be configured yet).
    try {
      await cloneWorkspaceRepo(existing.workspace.workspace_id, token);
    } catch (err) {
      console.warn("Workspace repo clone failed (non-fatal):", err);
    }
    return existing.workspace;
  }

  // Create new workspace
  const created = await createWorkspace(projectId, token);
  // Always try to ensure repo is cloned when opening the workspace.
  // Never block workspace boot if cloning fails (repo might not be configured yet).
  try {
    await cloneWorkspaceRepo(created.workspace.workspace_id, token);
  } catch (err) {
    console.warn("Workspace repo clone failed (non-fatal):", err);
  }
  return created.workspace;
}

export async function cloneWorkspaceRepo(
  workspaceId: string,
  token: string
): Promise<{
  success: boolean;
  status?: string;
  branch?: string;
  error?: string;
}> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/clone-repo`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({ success: false, error: "Failed to clone repo" }));

  if (!response.ok || !data?.success) {
    const errorMessage =
      data?.error || data?.detail || "Failed to clone repo into workspace";
    throw new Error(errorMessage);
  }

  return data;
}

export async function startWorkspace(
  workspaceId: string,
  token: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/start`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to start workspace" }));
    throw new Error(error.detail || "Failed to start workspace");
  }

  return response.json();
}

export async function stopWorkspace(
  workspaceId: string,
  token: string
): Promise<{ success: boolean }> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/stop`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to stop workspace" }));
    throw new Error(error.detail || "Failed to stop workspace");
  }

  return response.json();
}

export async function recreateWorkspace(
  workspaceId: string,
  token: string
): Promise<{
  success: boolean;
  message: string;
  workspace_id: string;
  container_id: string;
  status: string;
  ports: Record<string, string>;
}> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/recreate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to recreate workspace" }));
    throw new Error(error.detail || "Failed to recreate workspace");
  }

  return response.json();
}

// File System Operations

export async function listFiles(
  workspaceId: string,
  path: string,
  token: string
): Promise<FileItem[]> {
  const params = new URLSearchParams({ path });
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to list files" }));
    throw new Error(error.detail || "Failed to list files");
  }

  const data: ListFilesResponse = await response.json();
  return data.files;
}

export async function readFile(
  workspaceId: string,
  filePath: string,
  token: string
): Promise<string> {
  const params = new URLSearchParams({ path: filePath });
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files/content?${params}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("File not found. It may have been deleted.");
    }
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to read file" }));
    throw new Error(error.detail || "Failed to read file");
  }

  const data: ReadFileResponse = await response.json();
  return data.content;
}

export async function writeFile(
  workspaceId: string,
  filePath: string,
  content: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: filePath, content }),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to write file" }));
    throw new Error(error.detail || "Failed to write file");
  }
}

export async function createFile(
  workspaceId: string,
  filePath: string,
  isDirectory: boolean,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path: filePath, is_directory: isDirectory }),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to create file" }));
    throw new Error(error.detail || "Failed to create file");
  }
}

export async function deleteFile(
  workspaceId: string,
  filePath: string,
  token: string
): Promise<void> {
  const params = new URLSearchParams({ path: filePath });
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files?${params}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to delete file" }));
    throw new Error(error.detail || "Failed to delete file");
  }
}

export async function renameFile(
  workspaceId: string,
  oldPath: string,
  newPath: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/workspaces/${workspaceId}/files/rename`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ old_path: oldPath, new_path: newPath }),
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to rename file" }));
    const errorMessage =
      error.detail || error.message || "Failed to rename file";
    console.error("Rename API error:", {
      oldPath,
      newPath,
      error,
      status: response.status,
    });
    throw new Error(errorMessage);
  }
}

// Terminal Session Types

export interface TerminalSession {
  session_id: string;
  workspace_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export async function createTerminalSession(
  workspaceId: string,
  name: string,
  token: string
): Promise<TerminalSession> {
  const response = await fetch(`${API_BASE}/api/terminal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ workspace_id: workspaceId, name }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to create terminal session" }));
    throw new Error(error.detail || "Failed to create terminal session");
  }

  const data = await response.json();
  return data.session;
}

export async function listTerminalSessions(
  workspaceId: string,
  token: string
): Promise<TerminalSession[]> {
  const response = await fetch(
    `${API_BASE}/api/terminal/sessions/${workspaceId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to list terminal sessions" }));
    throw new Error(error.detail || "Failed to list terminal sessions");
  }

  const data = await response.json();
  return data.sessions;
}

export async function deleteTerminalSession(
  sessionId: string,
  token: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/api/terminal/sessions/${sessionId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ detail: "Failed to delete terminal session" }));
    throw new Error(error.detail || "Failed to delete terminal session");
  }
}
