'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { listFiles, createFile, deleteFile, type FileItem } from '../../lib/api-workspace'
import GitPanel from './GitPanel'
import type { GitCommitEntry, GitStatusResponse } from '../../lib/api-git'
import { useWorkspaceStore } from '../../hooks/useWorkspaceStore'
import { 
  File, 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  Plus, 
  FolderPlus, 
  RefreshCcw, 
  Trash2,
  FileCode,
  FileJson,
  FileText,
  FileTerminal,
  Loader2,
  MoreVertical,
  AlertCircle,
  GitBranch
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface FileExplorerProps {
  workspaceId: string
  onFileSelect: (path: string) => void
  selectedFile?: string
  onRefresh?: () => void
  isGitPanelOpen?: boolean
  onToggleGitPanel?: () => void
  gitStatus?: GitStatusResponse | null
  gitCommits?: GitCommitEntry[]
  gitLoading?: boolean
  onPull?: () => void
  onPush?: () => void
  onGitRefresh?: () => void
}

function FileIcon({ filename, isDirectory }: { filename: string; isDirectory: boolean }) {
  if (isDirectory) return null; // Icon handled by tree node

  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'py'].includes(ext)) return <FileCode className="w-3.5 h-3.5 text-blue-400" />
  if (ext === 'json') return <FileJson className="w-3.5 h-3.5 text-yellow-500" />
  if (['md', 'mdx', 'txt'].includes(ext)) return <FileText className="w-3.5 h-3.5 text-zinc-400" />
  if (['sh', 'bat', 'cmd'].includes(ext)) return <FileTerminal className="w-3.5 h-3.5 text-emerald-400" />
  return <File className="w-3.5 h-3.5 text-zinc-500" />
}

export default function FileExplorer({
  workspaceId,
  onFileSelect,
  selectedFile,
  onRefresh,
  isGitPanelOpen,
  onToggleGitPanel,
  gitStatus,
  gitCommits = [],
  gitLoading,
  onPull,
  onPush,
  onGitRefresh,
}: FileExplorerProps) {
  const { getToken } = useAuth()
  const { closeFilesUnderPath } = useWorkspaceStore()
  const [rootFiles, setRootFiles] = useState<FileItem[]>([])
  const [childrenMap, setChildrenMap] = useState<Map<string, FileItem[]>>(new Map())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [createType, setCreateType] = useState<'file' | 'folder'>('file')

  const loadRootFiles = useCallback(async () => {
    try {
      setIsLoading(true)
      const token = await getToken()
      if (!token) return
      const files = await listFiles(workspaceId, '/workspace', token)
      setRootFiles(files)
    } catch (err) {
      console.error('Explorer error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [workspaceId, getToken])

  useEffect(() => { loadRootFiles() }, [loadRootFiles])

  const handleToggle = async (path: string) => {
    const next = new Set(expandedFolders)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
      if (!childrenMap.has(path)) {
        const token = await getToken()
        if (token) {
          const files = await listFiles(workspaceId, path, token)
          setChildrenMap(new Map(childrenMap).set(path, files))
        }
      }
    }
    setExpandedFolders(next)
  }

  const handleDelete = async (path: string) => {
    try {
      const token = await getToken()
      if (!token) return
      
      setError(null)
      // Close any open files under this path (handles files and directories)
      closeFilesUnderPath(path)
      
      await deleteFile(workspaceId, path, token)
      
      loadRootFiles()
      setChildrenMap(new Map())
      onRefresh?.()
    } catch (err) {
      console.error('Delete error:', err)
      setError(err instanceof Error ? err.message : 'Failed to delete file')
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000)
    }
  }

  const handleCreate = async () => {
    if (!newFileName.trim()) return
    setError(null)
    try {
      const token = await getToken()
      if (!token) return
      const path = `/workspace/${newFileName.trim()}`
      await createFile(workspaceId, path, createType === 'folder', token)
      setIsCreating(false)
      setNewFileName('')
      loadRootFiles()
      setChildrenMap(new Map())
      onRefresh?.()
    } catch (err) {
      console.error('Create error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create item')
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000)
    }
  }

  const renderNode = (file: FileItem, level: number) => {
    const isExpanded = expandedFolders.has(file.path)
    const isSelected = selectedFile === file.path
    const children = childrenMap.get(file.path) || []

    return (
      <div key={file.path}>
        <div
          className={`group flex items-center gap-2 px-3 py-1 cursor-pointer transition-colors ${
            isSelected ? 'bg-blue-600/20 text-blue-100' : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
          }`}
          style={{ paddingLeft: `${level * 12 + 12}px` }}
          onClick={() => file.is_directory ? handleToggle(file.path) : onFileSelect(file.path)}
        >
          {file.is_directory ? (
            <div className="flex items-center gap-1.5">
              <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              {isExpanded ? <FolderOpen className="w-3.5 h-3.5 text-blue-400" /> : <Folder className="w-3.5 h-3.5 text-blue-400" />}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 ml-4">
              <FileIcon filename={file.name} isDirectory={false} />
            </div>
          )}
          <span className="text-[11px] font-medium truncate flex-1">{file.name}</span>
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-5 w-5 text-zinc-500 hover:text-white">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                <DropdownMenuItem onClick={() => handleDelete(file.path)} className="text-red-400 focus:text-red-400 focus:bg-red-400/10">
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {file.is_directory && isExpanded && (
          <div>
            {children.length > 0 ? (
              children.map(child => renderNode(child, level + 1))
            ) : (
              <div className="py-1 px-3 text-[10px] text-zinc-600 italic" style={{ paddingLeft: `${(level + 1) * 12 + 32}px` }}>
                Empty
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="h-10 flex items-center justify-between px-4 border-b border-zinc-800 bg-[#0c0c0e]">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Explorer</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 ${isGitPanelOpen ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-200'}`}
            onClick={onToggleGitPanel}
            title="Git Status"
          >
            <GitBranch className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => { setIsCreating(true); setCreateType('file'); }}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={() => { setIsCreating(true); setCreateType('folder'); }}
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 text-zinc-500 hover:text-zinc-200"
            onClick={loadRootFiles}
          >
            <RefreshCcw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {isGitPanelOpen && (
        <div className="p-3 border-b border-zinc-800">
          <GitPanel
            status={gitStatus || null}
            commits={gitCommits}
            isLoading={gitLoading}
            onPull={onPull || (() => {})}
            onPush={onPush || (() => {})}
            onRefresh={onGitRefresh || (() => {})}
          />
        </div>
      )}

      {isCreating && (
        <div className="p-3 bg-zinc-900 border-b border-zinc-800">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder={`New ${createType}...`}
            className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-600 mb-2"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button size="sm" className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-500 text-white" onClick={handleCreate}>Create</Button>
          </div>
        </div>
      )}

      {error && (
        <div className="mx-3 my-2 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-400 font-medium leading-tight">{error}</p>
        </div>
      )}

      <ScrollArea className="flex-1 py-2">
        {isLoading && rootFiles.length === 0 ? (
          <div className="flex flex-col gap-2 px-4 py-2">
            <Skeleton className="h-4 w-full bg-zinc-900" />
            <Skeleton className="h-4 w-3/4 bg-zinc-900" />
            <Skeleton className="h-4 w-5/6 bg-zinc-900" />
          </div>
        ) : rootFiles.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <File className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
            <p className="text-[10px] text-zinc-600 font-medium">Empty Workspace</p>
          </div>
        ) : (
          rootFiles.map(file => renderNode(file, 0))
        )}
      </ScrollArea>
    </div>
  )
}
