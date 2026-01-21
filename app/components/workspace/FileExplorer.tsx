"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  listFiles,
  createFile,
  deleteFile,
  renameFile,
  type FileItem,
} from "../../lib/api-workspace";
import { useWorkspaceStore } from "../../hooks/useWorkspaceStore";
import {
  File,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Plus,
  FolderPlus,
  RefreshCcw,
  Trash2,
  FileCode,
  FileJson,
  FileText,
  FileTerminal,
  MoreVertical,
  AlertCircle,
  Pencil,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FileExplorerProps {
  workspaceId: string;
  onFileSelect: (path: string) => void;
  selectedFile?: string;
  onRefresh?: () => void;
  onGitRefresh?: () => void;
}

function FileIcon({
  filename,
  isDirectory,
}: {
  filename: string;
  isDirectory: boolean;
}) {
  if (isDirectory) return null; // Icon handled by tree node

  const ext = filename.split(".").pop()?.toLowerCase() || "";
  if (["ts", "tsx", "js", "jsx", "mjs", "py"].includes(ext))
    return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
  if (ext === "json")
    return <FileJson className="w-3.5 h-3.5 text-yellow-500" />;
  if (["md", "mdx", "txt"].includes(ext))
    return <FileText className="w-3.5 h-3.5 text-zinc-400" />;
  if (["sh", "bat", "cmd"].includes(ext))
    return <FileTerminal className="w-3.5 h-3.5 text-emerald-400" />;
  return <File className="w-3.5 h-3.5 text-zinc-500" />;
}

export default function FileExplorer({
  workspaceId,
  onFileSelect,
  selectedFile,
  onRefresh,
  onGitRefresh,
}: FileExplorerProps) {
  const { getToken } = useAuth();
  const { closeFilesUnderPath } = useWorkspaceStore();
  const [rootFiles, setRootFiles] = useState<FileItem[]>([]);
  const [childrenMap, setChildrenMap] = useState<Map<string, FileItem[]>>(
    new Map()
  );
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [createType, setCreateType] = useState<"file" | "folder">("file");
  const [createParentPath, setCreateParentPath] =
    useState<string>("/workspace");
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [newFileNameForRename, setNewFileNameForRename] = useState("");

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<FileItem | null>(null);
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const dragCounterRef = useRef(0);

  const loadRootFiles = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) return;
      const files = await listFiles(workspaceId, "/workspace", token);
      setRootFiles(files);
    } catch (err) {
      console.error("Explorer error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, getToken]);

  useEffect(() => {
    loadRootFiles();
  }, [loadRootFiles]);

  const loadChildren = useCallback(
    async (path: string) => {
      const token = await getToken();
      if (!token) return;
      try {
        const files = await listFiles(workspaceId, path, token);
        setChildrenMap(new Map(childrenMap).set(path, files));
      } catch (err) {
        console.error("Error loading children:", err);
      }
    },
    [workspaceId, getToken, childrenMap]
  );

  const handleToggle = async (path: string) => {
    const next = new Set(expandedFolders);
    if (next.has(path)) {
      next.delete(path);
    } else {
      next.add(path);
      if (!childrenMap.has(path)) {
        await loadChildren(path);
      }
    }
    setExpandedFolders(next);
  };

  const handleDelete = async (path: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      setError(null);
      closeFilesUnderPath(path);
      await new Promise((resolve) => setTimeout(resolve, 100));

      await deleteFile(workspaceId, path, token);

      loadRootFiles();
      setChildrenMap(new Map());
      onRefresh?.();

      if (onGitRefresh) {
        setTimeout(() => {
          onGitRefresh();
        }, 300);
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError(err instanceof Error ? err.message : "Failed to delete file");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      // Construct path relative to parent folder
      const parentPath =
        createParentPath === "/workspace" ? "/workspace" : createParentPath;
      const path = `${parentPath}/${newFileName.trim()}`;

      await createFile(workspaceId, path, createType === "folder", token);
      setIsCreating(false);
      setNewFileName("");
      setCreateParentPath("/workspace");

      // Refresh the parent folder's children
      if (createParentPath !== "/workspace") {
        await loadChildren(createParentPath);
        // Expand parent if it's not already expanded
        if (!expandedFolders.has(createParentPath)) {
          setExpandedFolders(new Set(expandedFolders).add(createParentPath));
        }
      } else {
        loadRootFiles();
      }
      setChildrenMap(new Map());
      onRefresh?.();
    } catch (err) {
      console.error("Create error:", err);
      setError(err instanceof Error ? err.message : "Failed to create item");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRename = async () => {
    if (!newFileNameForRename.trim() || !renamingPath) return;
    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      const pathParts = renamingPath.split("/");
      const directory = pathParts.slice(0, -1).join("/");
      const newPath = directory
        ? `${directory}/${newFileNameForRename.trim()}`
        : newFileNameForRename.trim();

      await renameFile(workspaceId, renamingPath, newPath, token);
      setIsRenaming(false);
      setRenamingPath(null);
      setNewFileNameForRename("");
      loadRootFiles();
      setChildrenMap(new Map());
      onRefresh?.();

      if (selectedFile === renamingPath) {
        onFileSelect(newPath);
      }
    } catch (err) {
      console.error("Rename error:", err);
      setError(err instanceof Error ? err.message : "Failed to rename file");
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMove = async (sourcePath: string, targetPath: string) => {
    if (sourcePath === targetPath) return;

    // Prevent moving into itself or its children
    if (targetPath.startsWith(sourcePath + "/")) {
      setError("Cannot move folder into itself");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);
    try {
      const token = await getToken();
      if (!token) return;

      // Get source filename
      const sourceParts = sourcePath.split("/").filter(Boolean);
      const sourceName = sourceParts[sourceParts.length - 1];

      // Normalize target path (remove trailing slashes, ensure it starts with /workspace)
      let normalizedTarget = targetPath.trim();
      if (!normalizedTarget.startsWith("/workspace")) {
        normalizedTarget = "/workspace";
      }
      normalizedTarget = normalizedTarget.replace(/\/+$/, ""); // Remove trailing slashes
      normalizedTarget = normalizedTarget.replace(/\/+/g, "/"); // Remove double slashes

      // Construct new path - ensure no double slashes
      let newPath: string;
      if (normalizedTarget === "/workspace") {
        newPath = `/workspace/${sourceName}`;
      } else {
        newPath = `${normalizedTarget}/${sourceName}`;
      }

      // Final normalization to remove any double slashes
      newPath = newPath.replace(/\/+/g, "/");

      // Prevent moving to the same location
      if (sourcePath === newPath) {
        console.log("Skipping move - same location");
        return;
      }

      console.log(`Moving: ${sourcePath} -> ${newPath}`);
      await renameFile(workspaceId, sourcePath, newPath, token);

      // Close any open files under the moved path
      closeFilesUnderPath(sourcePath);
      await new Promise((resolve) => setTimeout(resolve, 100));

      loadRootFiles();
      setChildrenMap(new Map());
      onRefresh?.();

      if (onGitRefresh) {
        setTimeout(() => {
          onGitRefresh();
        }, 300);
      }

      // Update selection if the moved file was selected
      if (selectedFile === sourcePath) {
        onFileSelect(newPath);
      }
    } catch (err) {
      console.error("Move error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to move item";
      setError(`Move failed: ${errorMessage}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, item: FileItem) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", item.path);
  };

  const handleDragOver = (
    e: React.DragEvent,
    path: string,
    isDirectory: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    // Only highlight directories as drop targets
    if (isDirectory && draggedItem && draggedItem.path !== path) {
      // Prevent moving into itself or children
      if (!path.startsWith(draggedItem.path + "/")) {
        setDragOverPath(path);
      }
    } else {
      setDragOverPath(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setDragOverPath(null);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
  };

  const handleDrop = (
    e: React.DragEvent,
    targetPath: string,
    isDirectory: boolean
  ) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setDragOverPath(null);

    if (!draggedItem) return;
    if (draggedItem.path === targetPath) return;

    // Allow dropping on directories or root (when targetPath is empty/root)
    if (isDirectory || !targetPath || targetPath === "/workspace") {
      const finalTargetPath = isDirectory ? targetPath : "/workspace";
      handleMove(draggedItem.path, finalTargetPath);
    }
    setDraggedItem(null);
  };

  const startCreateInFolder = (parentPath: string, type: "file" | "folder") => {
    setCreateParentPath(parentPath);
    setCreateType(type);
    setIsCreating(true);
    setNewFileName("");
  };

  const renderNode = (file: FileItem, level: number) => {
    const isExpanded = expandedFolders.has(file.path);
    const isSelected = selectedFile === file.path;
    const children = childrenMap.get(file.path) || [];
    const isDragged = draggedItem?.path === file.path;
    const isDragOver = dragOverPath === file.path && file.is_directory;

    return (
      <div key={file.path}>
        <div
          className={`group flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors ${
            isSelected
              ? "bg-blue-600/20 text-blue-100"
              : isDragOver
                ? "bg-blue-500/30 text-blue-100 border-l-2 border-blue-500"
                : isDragged
                  ? "opacity-50"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() =>
            file.is_directory
              ? handleToggle(file.path)
              : onFileSelect(file.path)
          }
          draggable={!isCreating && !isRenaming}
          onDragStart={(e) => handleDragStart(e, file)}
          onDragOver={(e) => handleDragOver(e, file.path, file.is_directory)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, file.path, file.is_directory)}
        >
          {file.is_directory ? (
            <div className="flex items-center gap-1.5">
              <ChevronRight
                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              />
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-blue-400" />
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ml-4">
              <FileIcon filename={file.name} isDirectory={false} />
            </div>
          )}
          <span className="text-[11px] font-medium truncate flex-1">
            {file.name}
          </span>

          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
            {!isCreating && !isRenaming && (
              <div className="cursor-move text-zinc-600 hover:text-zinc-400">
                <GripVertical className="w-3 h-3" />
              </div>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 text-zinc-500 hover:text-white"
                >
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="bg-zinc-900 border-zinc-800 text-zinc-300"
              >
                {file.is_directory && (
                  <>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        startCreateInFolder(file.path, "file");
                      }}
                      className="text-zinc-300 focus:text-zinc-200 focus:bg-zinc-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-2" /> New File
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        startCreateInFolder(file.path, "folder");
                      }}
                      className="text-zinc-300 focus:text-zinc-200 focus:bg-zinc-800"
                    >
                      <FolderPlus className="w-3.5 h-3.5 mr-2" /> New Folder
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-zinc-800" />
                  </>
                )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingPath(file.path);
                    setNewFileNameForRename(file.name);
                    setIsRenaming(true);
                  }}
                  className="text-zinc-300 focus:text-zinc-200 focus:bg-zinc-800"
                >
                  <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(file.path);
                  }}
                  className="text-red-400 focus:text-red-400 focus:bg-red-400/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {file.is_directory && isExpanded && (
          <div>
            {children.length > 0 ? (
              children.map((child) => renderNode(child, level + 1))
            ) : (
              <div
                className="py-1 px-3 text-[10px] text-zinc-600 italic"
                style={{ paddingLeft: `${(level + 1) * 12 + 32}px` }}
              >
                Empty
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#09090b] relative">
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#0c0c0e] shrink-0">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => {
              const event = new CustomEvent("explorer-collapse");
              window.dispatchEvent(event);
            }}
            title="Hide Explorer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => startCreateInFolder("/workspace", "file")}
            title="New File"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => startCreateInFolder("/workspace", "folder")}
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={loadRootFiles}
            title="Refresh"
          >
            <RefreshCcw
              className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <div className="text-[10px] text-zinc-500 mb-1">
            Creating in:{" "}
            {createParentPath === "/workspace"
              ? "root"
              : createParentPath.replace("/workspace/", "")}
          </div>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              } else if (e.key === "Escape") {
                setIsCreating(false);
                setNewFileName("");
                setCreateParentPath("/workspace");
              }
            }}
            placeholder={`New ${createType}...`}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-600 mb-2"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                setIsCreating(false);
                setNewFileName("");
                setCreateParentPath("/workspace");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {isRenaming && (
        <div className="p-3 bg-zinc-900 border-b border-zinc-800 shrink-0">
          <input
            type="text"
            value={newFileNameForRename}
            onChange={(e) => setNewFileNameForRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleRename();
              } else if (e.key === "Escape") {
                setIsRenaming(false);
                setRenamingPath(null);
                setNewFileNameForRename("");
              }
            }}
            placeholder="New name..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-600 mb-2"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => {
                setIsRenaming(false);
                setRenamingPath(null);
                setNewFileNameForRename("");
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-500 text-white"
              onClick={handleRename}
            >
              Rename
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 my-2 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 animate-in fade-in slide-in-from-top-1 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-400 font-medium leading-tight">
            {error}
          </p>
        </div>
      )}

      <div
        className="flex-1 overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedItem) {
            e.dataTransfer.dropEffect = "move";
            setDragOverPath("/workspace");
          }
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverPath(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedItem) {
            handleMove(draggedItem.path, "/workspace");
            setDraggedItem(null);
            setDragOverPath(null);
          }
        }}
      >
        <ScrollArea className="h-full py-2">
          {isLoading && rootFiles.length === 0 ? (
            <div className="flex flex-col gap-2 px-4 py-2">
              <Skeleton className="h-4 w-full bg-zinc-900" />
              <Skeleton className="h-4 w-3/4 bg-zinc-900" />
              <Skeleton className="h-4 w-5/6 bg-zinc-900" />
            </div>
          ) : rootFiles.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <File className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
              <p className="text-[10px] text-zinc-600 font-medium">
                Empty Workspace
              </p>
            </div>
          ) : (
            rootFiles.map((file) => renderNode(file, 0))
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
