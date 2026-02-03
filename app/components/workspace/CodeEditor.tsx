"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { type Task, type Concept, completeTask } from "../../lib/api-roadmap";
import {
  verifyTask,
  type TaskVerificationResponse,
} from "../../lib/api-verification";
import {
  getOrCreateWorkspace,
  readFile,
  writeFile,
  recreateWorkspace,
  getPreviewServers,
  type PreviewServerInfo,
} from "../../lib/api-workspace";
import {
  getGitStatus,
  getCommits,
  pullFromRemote,
  pushToRemote,
  commitChanges,
  checkExternalCommits,
  resetExternalCommits,
  stageFiles,
  unstageFiles,
  getFileDiff,
  getCommitGraph,
  listBranches,
  createBranch,
  checkoutBranch,
  deleteBranch,
  checkConflicts,
  getConflictContent,
  resolveConflict,
  mergeBranch,
  abortMerge,
  resetToCommit,
  type GitCommitEntry,
  type GitStatusResponse,
  type CommitGraphEntry,
  type BranchInfo,
} from "../../lib/api-git";
import {
  startTaskSession,
  completeTaskSession,
} from "../../lib/api-task-sessions";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import MonacoEditor from "./MonacoEditor";
import FileExplorer from "./FileExplorer";
import TerminalTabs from "./TerminalTabs";
import RightSidePanel from "./RightSidePanel";
import DiffViewer from "./DiffViewer";
import UncommittedChangesDialog from "./UncommittedChangesDialog";
import ExternalCommitsNotification from "./ExternalCommitsNotification";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Save,
  FileCode,
  Terminal as TerminalIcon,
  AlertCircle,
  ChevronRight,
  Loader2,
  Globe,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface CodeEditorProps {
  task: Task;
  concept: Concept;
  projectId: string;
  onComplete: () => void;
  initialCompleted?: boolean;
  nextNavigation?: {
    type: "task" | "concept" | "day" | "complete";
    taskId?: string;
    taskType?: Task["task_type"];
    conceptId?: string;
    dayNumber?: number;
    projectId: string;
  } | null;
}

export default function CodeEditor({
  task,
  concept,
  projectId,
  onComplete,
  initialCompleted,
  nextNavigation,
}: CodeEditorProps) {
  const { getToken } = useAuth();

  // Centralized State
  const {
    openFiles,
    activeFilePath,
    workspaceId,
    setWorkspaceId,
    openFile,
    closeFile,
    updateFileContent,
    markFileSaved,
    setActiveFilePath,
  } = useWorkspaceStore();

  // Local UI State
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_output, setOutput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<TaskVerificationResponse | null>(null);
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null);
  const [gitCommits, setGitCommits] = useState<GitCommitEntry[]>([]);
  const [gitLoading, setGitLoading] = useState(false);
  const [commitGraph, setCommitGraph] = useState<CommitGraphEntry[]>([]);
  const [commitBranches, setCommitBranches] = useState<Record<string, string>>(
    {}
  );
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [uncommittedDialogOpen, setUncommittedDialogOpen] = useState(false);
  const [uncommittedFiles, setUncommittedFiles] = useState<string[]>([]);
  const [externalCommits, setExternalCommits] = useState<GitCommitEntry[]>([]);
  const [externalDismissed, setExternalDismissed] = useState(false);
  const [taskSessionId, setTaskSessionId] = useState<string | null>(null);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [diffViewerOpen, setDiffViewerOpen] = useState(false);
  const [diffViewerFile, setDiffViewerFile] = useState<string | null>(null);
  const [diffViewerStaged, setDiffViewerStaged] = useState(false);
  const [diffContent, setDiffContent] = useState<string>("");
  const [explorerCollapsed, setExplorerCollapsed] = useState(false);
  const [previewPortsOpen, setPreviewPortsOpen] = useState(false);
  const [isRecreating, setIsRecreating] = useState(false);
  const [previewPorts, setPreviewPorts] = useState<Record<string, string>>({
    "3000": "http://localhost:30001",
    "5000": "http://localhost:30002",
    "5173": "http://localhost:30003",
    "8080": "http://localhost:30005",
  });
  const [previewServers, setPreviewServers] = useState<PreviewServerInfo[]>([]);

  const activeFile = openFiles.find((f) => f.path === activeFilePath);
  const activePreviewServers = previewServers.filter(
    (server) => server.url && server.is_active !== false
  );
  const primaryPreviewUrl = activePreviewServers[0]?.url || null;
  const previewCount = activePreviewServers.length;
  const hasMultiplePreviews = previewCount > 1;

  // Collect user code from open files for chatbot context
  const userCode = openFiles.map((file) => ({
    path: file.path,
    content: file.content,
  }));

  const handleToggleExplorer = useCallback(() => {
    setExplorerCollapsed((prev) => !prev);
  }, []);

  const handleContentChange = useCallback(
    (newContent: string) => {
      if (activeFilePath) updateFileContent(activeFilePath, newContent);
    },
    [activeFilePath, updateFileContent]
  );

  // Listen for collapse event from FileExplorer
  useEffect(() => {
    const handleCollapse = () => {
      setExplorerCollapsed(true);
    };
    window.addEventListener("explorer-collapse", handleCollapse);
    return () => {
      window.removeEventListener("explorer-collapse", handleCollapse);
    };
  }, []);

  // Initialize workspace
  useEffect(() => {
    let mounted = true;
    async function initWorkspace() {
      try {
        setIsLoadingWorkspace(true);
        setWorkspaceError(null);
        const token = await getToken();
        if (!token || !mounted) return;
        const ws = await getOrCreateWorkspace(projectId, token);
        if (mounted) {
          setWorkspaceId(ws.workspace_id);
        }
      } catch (err) {
        console.error("Failed to init workspace:", err);
        if (mounted) {
          setWorkspaceError(
            err instanceof Error
              ? err.message
              : "Failed to initialize workspace"
          );
        }
      } finally {
        if (mounted) setIsLoadingWorkspace(false);
      }
    }
    initWorkspace();
    return () => {
      mounted = false;
    };
  }, [projectId, getToken, setWorkspaceId]);

  useEffect(() => {
    let mounted = true;
    async function initTaskSession() {
      if (!workspaceId || taskSessionId) return;
      try {
        const token = await getToken();
        if (!token || !mounted) return;
        const response = await startTaskSession(
          task.task_id,
          workspaceId,
          token
        );
        if (response.session?.session_id && mounted) {
          setTaskSessionId(response.session.session_id);
        }
      } catch (err) {
        console.error("Failed to start task session:", err);
      }
    }
    initTaskSession();
    return () => {
      mounted = false;
    };
  }, [workspaceId, task.task_id, getToken, taskSessionId]);

  const refreshPreviewServers = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const result = await getPreviewServers(workspaceId, token);
      if (result?.servers) {
        setPreviewServers(result.servers);
      }
    } catch (err) {
      console.warn("Failed to fetch preview servers:", err);
    }
  }, [workspaceId, getToken]);

  useEffect(() => {
    if (!workspaceId) return;
    let mounted = true;

    const tick = async () => {
      if (!mounted) return;
      await refreshPreviewServers();
    };

    tick();
    const intervalId = setInterval(() => {
      tick();
    }, 5000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [workspaceId, refreshPreviewServers]);

  useEffect(() => {
    if (!previewPortsOpen) return;
    refreshPreviewServers();
  }, [previewPortsOpen, refreshPreviewServers]);

  // Handle file selection from Explorer
  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!workspaceId) return;
      const existing = openFiles.find((f) => f.path === path);
      if (existing) {
        setActiveFilePath(path);
        return;
      }
      try {
        setIsLoadingFile(true);
        const token = await getToken();
        if (!token) return;
        const content = await readFile(workspaceId, path, token);
        openFile(path, content);
      } catch (err) {
        console.error("Failed to open file:", err);
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        // If file was deleted, close it from open files
        if (errorMsg.includes("not found") || errorMsg.includes("deleted")) {
          closeFile(path);
          if (activeFilePath === path) {
            // If this was the active file, switch to another file or clear selection
            const otherFiles = openFiles.filter((f) => f.path !== path);
            if (otherFiles.length > 0) {
              setActiveFilePath(otherFiles[0].path);
            } else {
              setActiveFilePath("");
            }
          }
          setOutput(`File ${path} was deleted`);
        } else {
          setOutput(`Failed to open file: ${errorMsg}`);
        }
      } finally {
        setIsLoadingFile(false);
      }
    },
    [
      workspaceId,
      openFiles,
      getToken,
      openFile,
      closeFile,
      setActiveFilePath,
      activeFilePath,
    ]
  );

  const refreshGitData = useCallback(async () => {
    if (!workspaceId) return;
    setGitLoading(true);
    try {
      const token = await getToken();
      if (!token) return;

      // Use Promise.allSettled to handle all requests gracefully
      const [
        statusResult,
        commitsResult,
        graphResult,
        branchesResult,
        conflictsResult,
      ] = await Promise.allSettled([
        getGitStatus(workspaceId, token),
        getCommits(workspaceId, token),
        getCommitGraph(workspaceId, token),
        listBranches(workspaceId, token),
        checkConflicts(workspaceId, token),
      ]);

      // Handle git status
      if (statusResult.status === "fulfilled" && statusResult.value) {
        setGitStatus(statusResult.value);
      }

      // Handle commits
      if (
        commitsResult.status === "fulfilled" &&
        commitsResult.value?.commits
      ) {
        setGitCommits(commitsResult.value.commits);
      }

      // Handle commit graph
      if (graphResult.status === "fulfilled" && graphResult.value?.success) {
        setCommitGraph(graphResult.value.commits || []);
        setCommitBranches(graphResult.value.branches || {});
      }

      // Handle branches
      if (
        branchesResult.status === "fulfilled" &&
        branchesResult.value?.success &&
        branchesResult.value.branches
      ) {
        setBranches(branchesResult.value.branches);
      }

      // Handle conflicts
      if (
        conflictsResult.status === "fulfilled" &&
        conflictsResult.value?.success
      ) {
        setConflicts(conflictsResult.value.conflicts || []);
      }

      // Check external commits (only if not dismissed)
      if (!externalDismissed) {
        try {
          const external = await checkExternalCommits(workspaceId, token);
          if (external.has_external_commits && external.external_commits) {
            setExternalCommits(external.external_commits);
          }
        } catch {
          // Silently ignore external commits check failures
        }
      }
    } catch {
      // Silently handle any unexpected errors
    } finally {
      setGitLoading(false);
    }
  }, [workspaceId, getToken, externalDismissed]);

  const handleSave = useCallback(async () => {
    if (!workspaceId || !activeFile || !activeFile.isDirty) return;
    try {
      setIsSaving(true);
      const token = await getToken();
      if (!token) return;
      await writeFile(workspaceId, activeFile.path, activeFile.content, token);
      markFileSaved(activeFile.path);
      setOutput("✓ File saved successfully");
      // Refresh git status after saving to detect changes immediately
      await refreshGitData();
    } catch (err) {
      console.error("Failed to save file:", err);
      setOutput(
        `Error saving: ${err instanceof Error ? err.message : "Unknown"}`
      );
    } finally {
      setIsSaving(false);
    }
  }, [workspaceId, activeFile, getToken, markFileSaved, refreshGitData]);

  // Refresh git data when workspace becomes available.
  useEffect(() => {
    if (!workspaceId) return;
    refreshGitData();
  }, [workspaceId, refreshGitData]);

  const handlePull = useCallback(async () => {
    if (!workspaceId) return;
    setGitLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await pullFromRemote(workspaceId, token, "main");
      if (result.conflict === "uncommitted") {
        setUncommittedFiles(result.files || []);
        setUncommittedDialogOpen(true);
        return;
      }
      setOutput("✓ Pull completed");
      await refreshGitData();
    } catch (err) {
      setOutput(
        `Pull failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setGitLoading(false);
    }
  }, [workspaceId, getToken, refreshGitData]);

  const handlePush = useCallback(async () => {
    if (!workspaceId) return;

    // Check if there are uncommitted changes
    const hasUncommittedChanges =
      gitStatus &&
      ((gitStatus.modified && gitStatus.modified.length > 0) ||
        (gitStatus.staged && gitStatus.staged.length > 0) ||
        (gitStatus.untracked && gitStatus.untracked.length > 0));

    // If there are uncommitted changes, open commit dialog
    if (hasUncommittedChanges) {
      setCommitMessage("");
      setCommitDialogOpen(true);
      return;
    }

    // If there are commits ready to push, push directly
    if (gitStatus && gitStatus.ahead && gitStatus.ahead > 0) {
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setOutput("Authentication required");
          return;
        }
        const currentBranch = gitStatus?.branch || "main";
        // Check if this is a new branch that needs upstream tracking
        const branchExists = branches.some((b) => b.name === currentBranch);
        const isNewBranch = !branchExists;
        await pushToRemote(workspaceId, token, currentBranch, isNewBranch);
        setOutput(
          `✓ Push completed${isNewBranch ? " (branch created on remote)" : ""}`
        );
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Push failed: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
      return;
    }

    // No changes and nothing to push
    setOutput("Nothing to push");
  }, [workspaceId, gitStatus, branches, getToken, refreshGitData]);

  const handleStage = useCallback(
    async (files?: string[]) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setOutput("Authentication required");
          return;
        }
        await stageFiles(workspaceId, token, files);
        setOutput(
          files ? `✓ Staged ${files.length} file(s)` : "✓ Staged all changes"
        );
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to stage: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleUnstage = useCallback(
    async (files?: string[]) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) {
          setOutput("Authentication required");
          return;
        }
        await unstageFiles(workspaceId, token, files);
        setOutput(
          files ? `✓ Unstaged ${files.length} file(s)` : "✓ Unstaged all files"
        );
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to unstage: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleViewDiff = useCallback(
    async (filePath: string, staged: boolean) => {
      if (!workspaceId) return;

      // Close any existing diff viewer first to reset state
      setDiffViewerOpen(false);
      setDiffViewerFile(null);
      setDiffContent("");

      // Small delay to ensure state is reset
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        const token = await getToken();
        if (!token) return;
        const result = await getFileDiff(workspaceId, token, filePath, staged);
        if (result.success) {
          // Allow empty diff (for files with no changes or new files)
          setDiffContent(result.diff || "");
          setDiffViewerFile(filePath);
          setDiffViewerStaged(staged);
          setDiffViewerOpen(true);
        } else {
          setOutput(`Failed to load diff: ${result.error || "Unknown error"}`);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to load diff: ${errorMsg}`);
      }
    },
    [workspaceId, getToken]
  );

  const handleCreateBranch = useCallback(
    async (name: string, startPoint?: string) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        await createBranch(workspaceId, token, name, startPoint);
        setOutput(`✓ Branch "${name}" created`);
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to create branch: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleCheckoutBranch = useCallback(
    async (name: string, create = false) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const result = await checkoutBranch(workspaceId, token, name, create);
        setOutput(`✓ Switched to branch "${name}"`);
        // Store if this is a new branch for push tracking
        if (create && result.is_new_branch) {
          // New branches need upstream tracking when pushed
          setOutput(
            `✓ Switched to branch "${name}" (new branch - will set upstream on first push)`
          );
        }
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to checkout branch: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleDeleteBranch = useCallback(
    async (name: string, force = false) => {
      if (!workspaceId) return;

      // Prevent deleting current branch
      if (name === gitStatus?.branch) {
        setOutput(
          `⚠️ Cannot delete the current branch "${name}". Switch to another branch first.`
        );
        return;
      }

      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        await deleteBranch(workspaceId, token, name, force);
        setOutput(`✓ Branch "${name}" deleted`);
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to delete branch: ${errorMsg}`);
        throw err; // Re-throw so UI can show error
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, gitStatus?.branch, getToken, refreshGitData]
  );

  const handleGetConflictContent = useCallback(
    async (filePath: string): Promise<string> => {
      if (!workspaceId) throw new Error("No workspace");
      const token = await getToken();
      if (!token) throw new Error("No token");
      const result = await getConflictContent(workspaceId, token, filePath);
      if (result.success && result.content) {
        return result.content;
      }
      throw new Error("Failed to get conflict content");
    },
    [workspaceId, getToken]
  );

  const handleResolveConflict = useCallback(
    async (
      filePath: string,
      side: "ours" | "theirs" | "both",
      content?: string
    ) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        await resolveConflict(workspaceId, token, filePath, side, content);
        setOutput(`✓ Conflict resolved: ${filePath}`);
        await refreshGitData();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to resolve conflict: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleWriteFileForConflict = useCallback(
    async (filePath: string, content: string) => {
      if (!workspaceId) return;
      const token = await getToken();
      if (!token) return;
      await writeFile(workspaceId, filePath, content, token);
    },
    [workspaceId, getToken]
  );

  const handleMerge = useCallback(
    async (branch: string, noFF: boolean, message?: string) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const result = await mergeBranch(
          workspaceId,
          token,
          branch,
          noFF,
          message
        );
        if (result.has_conflicts) {
          setOutput(
            `⚠️ Merge conflicts detected. Resolve them in the Conflicts tab.`
          );
          await refreshGitData(); // Refresh to show conflicts
        } else {
          setOutput(`✓ Merged "${branch}" into current branch`);
          await refreshGitData();
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to merge: ${errorMsg}`);
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleAbortMerge = useCallback(async () => {
    if (!workspaceId) return;
    setGitLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      await abortMerge(workspaceId, token);
      setOutput("✓ Merge aborted");
      await refreshGitData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setOutput(`Failed to abort merge: ${errorMsg}`);
    } finally {
      setGitLoading(false);
    }
  }, [workspaceId, getToken, refreshGitData]);

  const handleResetToCommit = useCallback(
    async (sha: string) => {
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        await resetToCommit(workspaceId, token, sha, true);
        await refreshGitData();
        setOutput(`✓ Reset to commit ${sha.slice(0, 7)}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setOutput(`Failed to reset to commit: ${errorMsg}`);
        throw err; // Re-throw so the UI can handle it
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleCommitAndPush = useCallback(async () => {
    if (!workspaceId) return;
    if (!commitMessage.trim()) {
      setOutput("Commit message is required");
      return;
    }

    // Check if there are staged files
    const hasStagedFiles =
      gitStatus && gitStatus.staged && gitStatus.staged.length > 0;
    if (!hasStagedFiles) {
      setOutput("No staged files to commit. Stage files first.");
      return;
    }

    setGitLoading(true);
    try {
      const token = await getToken();
      if (!token) {
        setOutput("Authentication required");
        return;
      }
      await commitChanges(workspaceId, token, commitMessage.trim());
      const currentBranch = gitStatus?.branch || "main";
      // Check if this is a new branch that needs upstream tracking
      const branchExists = branches.some((b) => b.name === currentBranch);
      const isNewBranch = !branchExists;
      await pushToRemote(workspaceId, token, currentBranch, isNewBranch);
      setOutput(
        `✓ Commit and push completed${isNewBranch ? " (branch created on remote)" : ""}`
      );
      setCommitDialogOpen(false);
      await refreshGitData();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      if (errorMsg.toLowerCase().includes("nothing to commit")) {
        setOutput("No staged files to commit. Stage files first.");
      } else {
        setOutput(`Push failed: ${errorMsg}`);
      }
    } finally {
      setGitLoading(false);
    }
  }, [
    workspaceId,
    commitMessage,
    gitStatus,
    branches,
    getToken,
    refreshGitData,
  ]);

  const handleUncommittedAction = useCallback(
    async (action: "commit" | "stash" | "discard" | "cancel") => {
      setUncommittedDialogOpen(false);
      if (action === "cancel") return;
      if (!workspaceId) return;
      setGitLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        await pullFromRemote(workspaceId, token, "main", action);
        setOutput(`✓ Pull completed (${action})`);
        await refreshGitData();
      } catch (err) {
        setOutput(
          `Pull failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      } finally {
        setGitLoading(false);
      }
    },
    [workspaceId, getToken, refreshGitData]
  );

  const handleExternalReset = useCallback(async () => {
    if (!workspaceId) return;
    setGitLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      await resetExternalCommits(workspaceId, token);
      setExternalCommits([]);
      setExternalDismissed(true);
      setOutput("✓ External commits reset");
      await refreshGitData();
    } catch (err) {
      setOutput(
        `Reset failed: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setGitLoading(false);
    }
  }, [workspaceId, getToken, refreshGitData]);

  const handleRecreateWorkspace = useCallback(async () => {
    if (!workspaceId) return;
    setIsRecreating(true);
    try {
      const token = await getToken();
      if (!token) return;
      const result = await recreateWorkspace(workspaceId, token);
      if (result.success && result.ports) {
        // Convert ports format: {"3000/tcp": "http://localhost:30001"} -> {"3000": "http://localhost:30001"}
        const portMap: Record<string, string> = {};
        Object.entries(result.ports).forEach(([key, url]) => {
          const port = key.replace("/tcp", "");
          portMap[port] = url;
        });
        setPreviewPorts(portMap);
      }
      setOutput(
        "✓ Workspace recreated with port mappings. Restart your dev server."
      );
    } catch (err) {
      setOutput(
        `Failed to recreate: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsRecreating(false);
    }
  }, [workspaceId, getToken]);

  const handleVerifyTask = async () => {
    if (!workspaceId) {
      setOutput("Workspace not ready. Please wait...");
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const token = await getToken();
      if (!token) {
        setOutput("Authentication required.");
        return;
      }

      // Call verification API
      const result = await verifyTask(task.task_id, workspaceId, token);
      setVerificationResult(result);

      if (result.passed) {
        // If verification passes, mark task as complete
        await completeTask(projectId, task.task_id, token);
        if (taskSessionId) {
          await completeTaskSession(taskSessionId, token);
        }
        setIsCompleted(true);
        onComplete();
        setOutput("✓ Task verified and completed successfully!");
      } else {
        setOutput(`Verification failed: ${result.overall_feedback}`);
      }
    } catch (error) {
      setOutput(
        `Verification error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setVerificationResult(null);
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoadingWorkspace) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <span className="text-zinc-400 font-medium">
            Spawning your container...
          </span>
        </div>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <Card className="bg-zinc-900 border-zinc-800 max-w-md w-full">
          <CardHeader className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
            <CardTitle className="text-white">Workspace Error</CardTitle>
            <CardDescription className="text-zinc-400 mt-2">
              {workspaceError}
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pb-8">
            <Button
              onClick={() => window.location.reload()}
              className="bg-zinc-800 hover:bg-zinc-700 text-white"
            >
              Retry Connection
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-[#09090b] flex flex-col overflow-hidden">
      <UncommittedChangesDialog
        open={uncommittedDialogOpen}
        files={uncommittedFiles}
        onClose={() => setUncommittedDialogOpen(false)}
        onAction={handleUncommittedAction}
      />
      <Dialog
        open={diffViewerOpen && diffViewerFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDiffViewerOpen(false);
            setDiffViewerFile(null);
            setDiffContent("");
          }
        }}
      >
        <DialogContent
          className="bg-[#0c0c0e] border border-zinc-800 max-w-4xl max-h-[90vh] p-0 flex flex-col"
          showCloseButton={false}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {diffViewerFile
                ? `Diff Viewer - ${diffViewerFile}`
                : "Diff Viewer"}
            </DialogTitle>
          </DialogHeader>
          {diffViewerFile && (
            <DiffViewer
              filePath={diffViewerFile}
              diff={diffContent}
              staged={diffViewerStaged}
              onClose={() => {
                setDiffViewerOpen(false);
                setDiffViewerFile(null);
                setDiffContent("");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={commitDialogOpen} onOpenChange={setCommitDialogOpen}>
        <DialogContent className="bg-[#0c0c0e] border border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white">Commit and Push</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Commit Message
            </label>
            <Input
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes"
              className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setCommitDialogOpen(false)}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCommitAndPush}
              disabled={gitLoading}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {gitLoading ? "Pushing..." : "Commit & Push"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewPortsOpen} onOpenChange={setPreviewPortsOpen}>
        <DialogContent className="bg-[#0c0c0e] border border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Preview Ports
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">
              When you run a dev server (e.g.,{" "}
              <code className="bg-zinc-800 px-1 rounded">npm run dev</code>),
              access it using these URLs:
            </p>
            <div className="space-y-3">
              <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
                Detected Previews
              </div>
              {previewCount === 0 && (
                <div className="text-xs text-zinc-500">
                  No previews detected yet. Start a server in the terminal to
                  see a link.
                </div>
              )}
              {previewCount === 1 && primaryPreviewUrl && (
                <Button
                  onClick={() => window.open(primaryPreviewUrl, "_blank")}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  Open Preview
                </Button>
              )}
              {hasMultiplePreviews && (
                <div className="grid gap-2">
                  {activePreviewServers.map((server, index) => (
                    <Button
                      key={`${server.container_port}-${server.url}`}
                      onClick={() =>
                        server.url && window.open(server.url, "_blank")
                      }
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white justify-between"
                    >
                      <span>{`Preview ${index + 1}`}</span>
                      <span className="text-[10px] text-emerald-100">
                        Port {server.container_port}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800">
                <div className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
                  Default Ports
                </div>
                <div className="text-xs text-zinc-500">
                  If detection misses a server, use the default port list below.
                </div>
                <div className="mt-2 space-y-2">
                  {Object.entries(previewPorts).map(([port, url]) => (
                    <div
                      key={port}
                      className="flex items-center justify-between p-2 bg-zinc-900 rounded border border-zinc-800"
                    >
                      <span className="text-sm text-zinc-300">
                        Container port{" "}
                        <code className="bg-zinc-800 px-1 rounded text-blue-400">
                          {port}
                        </code>
                      </span>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300"
                      >
                        {url}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500 mb-3">
                Connection refused? Your container may need port mappings. Click
                below to fix:
              </p>
              <Button
                onClick={handleRecreateWorkspace}
                disabled={isRecreating}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-white"
              >
                {isRecreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Recreating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recreate Container with Port Mappings
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="relative h-full">
        {/* Restore button when collapsed */}
        {explorerCollapsed && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 z-[100] pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleExplorer}
              className="h-10 w-8 bg-zinc-800 hover:bg-zinc-700 border-r-2 border-zinc-600 rounded-r-lg shadow-xl hover:shadow-2xl transition-all"
              title="Show Explorer"
            >
              <ChevronRight className="w-5 h-5 text-zinc-200" />
            </Button>
          </div>
        )}

        <ResizablePanelGroup direction="horizontal">
          {!explorerCollapsed && (
            <>
              <ResizablePanel
                defaultSize={18}
                minSize={0}
                maxSize={40}
                collapsible
                className="border-r border-zinc-800 bg-[#09090b]"
              >
                {workspaceId ? (
                  <FileExplorer
                    workspaceId={workspaceId}
                    onFileSelect={handleFileSelect}
                    selectedFile={activeFilePath || undefined}
                    onGitRefresh={refreshGitData}
                  />
                ) : (
                  <div className="p-4 flex flex-col gap-2">
                    <Skeleton className="h-4 w-full bg-zinc-900" />
                    <Skeleton className="h-4 w-3/4 bg-zinc-900" />
                  </div>
                )}
              </ResizablePanel>
              <ResizableHandle
                withHandle
                className="bg-zinc-800 hover:bg-zinc-700 transition-colors"
              />
            </>
          )}

          {/* Center: Editor & Terminal */}
          <ResizablePanel
            defaultSize={explorerCollapsed ? 82 : 55}
            minSize={40}
          >
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={70} className="flex flex-col">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-4 h-10 bg-[#121214] border-b border-zinc-800">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[300px]">
                      {activeFilePath || "No file selected"}
                    </span>
                    {isLoadingFile && (
                      <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />
                    )}
                    {gitStatus && (
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-bold tracking-widest bg-zinc-900 border-zinc-800 text-zinc-400"
                      >
                        {gitStatus.branch || "branch"} ↑ {gitStatus.ahead || 0}{" "}
                        ↓ {gitStatus.behind || 0}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving || !activeFile?.isDirty}
                      className="h-7 px-2.5 text-[11px] font-medium text-zinc-400 hover:text-white"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      Save
                    </Button>
                  </div>
                </div>

                {/* Editor */}
                <div className="flex-1 relative bg-[#18181b]">
                  {activeFile ? (
                    <MonacoEditor
                      value={activeFile.content}
                      onChange={handleContentChange}
                      path={activeFile.path}
                      onSave={handleSave}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-4 opacity-40">
                      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-zinc-700 flex items-center justify-center">
                        <FileCode className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-medium">
                        Select a file from the explorer
                      </p>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-zinc-800" />

              {/* Bottom Panel: Terminal */}
              <ResizablePanel defaultSize={30} className="bg-[#0c0c0e]">
                <div className="flex items-center justify-between px-4 h-8 border-b border-zinc-800 bg-[#09090b]">
                  <div className="flex items-center gap-2">
                    <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Terminal
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {primaryPreviewUrl && (
                      <Button
                        onClick={() => window.open(primaryPreviewUrl, "_blank")}
                        className="h-6 px-2 text-[10px] font-medium bg-emerald-600 hover:bg-emerald-500 text-white"
                        title="Open detected preview"
                      >
                        Open Preview
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPortsOpen(true)}
                      className={`h-6 px-2 text-[10px] font-medium ${
                        previewCount > 0
                          ? "text-emerald-400 hover:text-emerald-300"
                          : "text-zinc-500 hover:text-white"
                      }`}
                      title="Preview running servers"
                    >
                      <Globe className="w-3 h-3 mr-1" />
                      Preview{previewCount > 0 ? ` (${previewCount})` : ""}
                    </Button>
                  </div>
                </div>
                <div className="h-[calc(100%-32px)]">
                  {workspaceId ? (
                    <TerminalTabs
                      workspaceId={workspaceId}
                      previewServerCount={previewCount}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-zinc-700 animate-spin" />
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Right Panel: Task, Git, Chat */}
          <ResizablePanel
            defaultSize={27}
            minSize={20}
            className="bg-[#09090b] flex flex-col"
          >
            {!externalDismissed && externalCommits.length > 0 && (
              <div className="p-4 border-b border-zinc-800">
                <ExternalCommitsNotification
                  commits={externalCommits}
                  onReset={handleExternalReset}
                  onDismiss={() => setExternalDismissed(true)}
                />
              </div>
            )}
            <RightSidePanel
              task={task}
              isCompleted={isCompleted}
              isVerifying={isVerifying}
              onVerifyTask={handleVerifyTask}
              verificationResult={verificationResult}
              nextNavigation={nextNavigation}
              gitStatus={gitStatus}
              gitCommits={gitCommits}
              gitLoading={gitLoading}
              commitGraph={commitGraph}
              commitBranches={commitBranches}
              branches={branches}
              conflicts={conflicts}
              onPull={handlePull}
              onPush={handlePush}
              onGitRefresh={refreshGitData}
              onStage={handleStage}
              onUnstage={handleUnstage}
              onViewDiff={handleViewDiff}
              onCreateBranch={handleCreateBranch}
              onCheckoutBranch={handleCheckoutBranch}
              onDeleteBranch={handleDeleteBranch}
              onResolveConflict={handleResolveConflict}
              onGetConflictContent={handleGetConflictContent}
              onWriteFile={handleWriteFileForConflict}
              onMerge={handleMerge}
              onAbortMerge={handleAbortMerge}
              onCommitClick={(sha) => {
                setOutput(`Selected commit: ${sha.slice(0, 7)}`);
              }}
              onResetToCommit={handleResetToCommit}
              workspaceId={workspaceId || undefined}
              projectId={projectId}
              concept={concept}
              userCode={userCode}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
