'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { type Task, completeTask } from '../../lib/api-roadmap'
import { getOrCreateWorkspace, readFile, writeFile } from '../../lib/api-workspace'
import { 
  getGitStatus, 
  getCommits, 
  pullFromRemote, 
  pushToRemote, 
  checkExternalCommits, 
  resetExternalCommits,
  type GitCommitEntry,
  type GitStatusResponse
} from '../../lib/api-git'
import { startTaskSession, completeTaskSession } from '../../lib/api-task-sessions'
import { useWorkspaceStore } from '../../hooks/useWorkspaceStore'
import MonacoEditor from './MonacoEditor'
import FileExplorer from './FileExplorer'
import TerminalTabs from './TerminalTabs'
import GitPanel from './GitPanel'
import UncommittedChangesDialog from './UncommittedChangesDialog'
import ExternalCommitsNotification from './ExternalCommitsNotification'
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable"
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { 
  Save, 
  CheckCircle2, 
  X, 
  FileCode, 
  Terminal as TerminalIcon,
  AlertCircle,
  ChevronRight,
  Loader2,
  Clock
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../components/ui/tooltip'

interface CodeEditorProps {
  task: Task
  projectId: string
  onComplete: () => void
  initialCompleted?: boolean
}

export default function CodeEditor({ task, projectId, onComplete, initialCompleted }: CodeEditorProps) {
  const { getToken } = useAuth()
  
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
    setActiveFilePath
  } = useWorkspaceStore()
  
  // Local UI State
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(true)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isLoadingFile, setIsLoadingFile] = useState(false)
  const [output, setOutput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [gitStatus, setGitStatus] = useState<GitStatusResponse | null>(null)
  const [gitCommits, setGitCommits] = useState<GitCommitEntry[]>([])
  const [gitLoading, setGitLoading] = useState(false)
  const [isGitPanelOpen, setIsGitPanelOpen] = useState(false)
  const [uncommittedDialogOpen, setUncommittedDialogOpen] = useState(false)
  const [uncommittedFiles, setUncommittedFiles] = useState<string[]>([])
  const [externalCommits, setExternalCommits] = useState<GitCommitEntry[]>([])
  const [externalDismissed, setExternalDismissed] = useState(false)
  const [taskSessionId, setTaskSessionId] = useState<string | null>(null)

  const activeFile = openFiles.find(f => f.path === activeFilePath)

  // Initialize workspace
  useEffect(() => {
    let mounted = true
    async function initWorkspace() {
      try {
        setIsLoadingWorkspace(true)
        setWorkspaceError(null)
        const token = await getToken()
        if (!token || !mounted) return
        const ws = await getOrCreateWorkspace(projectId, token)
        if (mounted) {
          setWorkspaceId(ws.workspace_id)
        }
      } catch (err) {
        console.error('Failed to init workspace:', err)
        if (mounted) {
          setWorkspaceError(err instanceof Error ? err.message : 'Failed to initialize workspace')
        }
      } finally {
        if (mounted) setIsLoadingWorkspace(false)
      }
    }
    initWorkspace()
    return () => { mounted = false }
  }, [projectId, getToken, setWorkspaceId])

  useEffect(() => {
    let mounted = true
    async function initTaskSession() {
      if (!workspaceId || taskSessionId) return
      try {
        const token = await getToken()
        if (!token || !mounted) return
        const response = await startTaskSession(task.task_id, workspaceId, token)
        if (response.session?.session_id && mounted) {
          setTaskSessionId(response.session.session_id)
        }
      } catch (err) {
        console.error('Failed to start task session:', err)
      }
    }
    initTaskSession()
    return () => { mounted = false }
  }, [workspaceId, task.task_id, getToken, taskSessionId])

  // Handle file selection from Explorer
  const handleFileSelect = useCallback(async (path: string) => {
    if (!workspaceId) return
    const existing = openFiles.find(f => f.path === path)
    if (existing) {
      setActiveFilePath(path)
      return
    }
    try {
      setIsLoadingFile(true)
      const token = await getToken()
      if (!token) return
      const content = await readFile(workspaceId, path, token)
      openFile(path, content)
    } catch (err) {
      console.error('Failed to open file:', err)
      setOutput(`Failed to open file: ${path}`)
    } finally {
      setIsLoadingFile(false)
    }
  }, [workspaceId, openFiles, getToken, openFile, setActiveFilePath])

  const handleSave = useCallback(async () => {
    if (!workspaceId || !activeFile || !activeFile.isDirty) return
    try {
      setIsSaving(true)
      const token = await getToken()
      if (!token) return
      await writeFile(workspaceId, activeFile.path, activeFile.content, token)
      markFileSaved(activeFile.path)
      setOutput('✓ File saved successfully')
    } catch (err) {
      console.error('Failed to save file:', err)
      setOutput(`Error saving: ${err instanceof Error ? err.message : 'Unknown'}`)
    } finally {
      setIsSaving(false)
    }
  }, [workspaceId, activeFile, getToken, markFileSaved])

  const refreshGitData = useCallback(async () => {
    if (!workspaceId) return
    setGitLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const [status, commits] = await Promise.all([
        getGitStatus(workspaceId, token),
        getCommits(workspaceId, token)
      ])
      setGitStatus(status)
      setGitCommits(commits.commits || [])

      if (!externalDismissed) {
        const external = await checkExternalCommits(workspaceId, token)
        if (external.has_external_commits && external.external_commits) {
          setExternalCommits(external.external_commits)
        }
      }
    } catch (err) {
      console.error('Failed to refresh git status:', err)
    } finally {
      setGitLoading(false)
    }
  }, [workspaceId, getToken, externalDismissed])

  useEffect(() => {
    if (!workspaceId) return
    refreshGitData()
  }, [workspaceId, refreshGitData])

  const handlePull = useCallback(async () => {
    if (!workspaceId) return
    setGitLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      const result = await pullFromRemote(workspaceId, token, 'main')
      if (result.conflict === 'uncommitted') {
        setUncommittedFiles(result.files || [])
        setUncommittedDialogOpen(true)
        return
      }
      setOutput('✓ Pull completed')
      await refreshGitData()
    } catch (err) {
      setOutput(`Pull failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGitLoading(false)
    }
  }, [workspaceId, getToken, refreshGitData])

  const handlePush = useCallback(async () => {
    if (!workspaceId) return
    setGitLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      await pushToRemote(workspaceId, token, 'main')
      setOutput('✓ Push completed')
      await refreshGitData()
    } catch (err) {
      setOutput(`Push failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGitLoading(false)
    }
  }, [workspaceId, getToken, refreshGitData])

  const handleUncommittedAction = useCallback(async (action: 'commit' | 'stash' | 'discard' | 'cancel') => {
    setUncommittedDialogOpen(false)
    if (action === 'cancel') return
    if (!workspaceId) return
    setGitLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      await pullFromRemote(workspaceId, token, 'main', action)
      setOutput(`✓ Pull completed (${action})`)
      await refreshGitData()
    } catch (err) {
      setOutput(`Pull failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGitLoading(false)
    }
  }, [workspaceId, getToken, refreshGitData])

  const handleExternalReset = useCallback(async () => {
    if (!workspaceId) return
    setGitLoading(true)
    try {
      const token = await getToken()
      if (!token) return
      await resetExternalCommits(workspaceId, token)
      setExternalCommits([])
      setExternalDismissed(true)
      setOutput('✓ External commits reset')
      await refreshGitData()
    } catch (err) {
      setOutput(`Reset failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setGitLoading(false)
    }
  }, [workspaceId, getToken, refreshGitData])

  const handleVerifyTask = async () => {
    const hasCode = openFiles.some(f => f.content.trim().length > 10)
    if (!hasCode) {
      setOutput('Please write some code before verifying.')
      return
    }
    setIsVerifying(true)
    try {
      const token = await getToken()
      if (!token) return
      await completeTask(projectId, task.task_id, token)
      if (taskSessionId) {
        await completeTaskSession(taskSessionId, token)
      }
      setIsCompleted(true)
      onComplete()
      setOutput('✓ Task verified successfully!')
    } catch (error) {
      setOutput('Verification failed. Check your logic.')
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoadingWorkspace) {
    return (
      <div className="flex items-center justify-center h-full bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
          <span className="text-zinc-400 font-medium">Spawning your container...</span>
        </div>
      </div>
    )
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
            <CardDescription className="text-zinc-400 mt-2">{workspaceError}</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center pb-8">
            <Button onClick={() => window.location.reload()} className="bg-zinc-800 hover:bg-zinc-700 text-white">
              Retry Connection
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full bg-[#09090b] flex flex-col overflow-hidden">
      <UncommittedChangesDialog
        open={uncommittedDialogOpen}
        files={uncommittedFiles}
        onClose={() => setUncommittedDialogOpen(false)}
        onAction={handleUncommittedAction}
      />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={18} minSize={12} maxSize={30} className="border-r border-zinc-800 bg-[#09090b]">
          {workspaceId ? (
            <FileExplorer
              workspaceId={workspaceId}
              onFileSelect={handleFileSelect}
              selectedFile={activeFilePath || undefined}
              isGitPanelOpen={isGitPanelOpen}
              onToggleGitPanel={() => setIsGitPanelOpen(prev => !prev)}
              gitStatus={gitStatus}
              gitCommits={gitCommits}
              gitLoading={gitLoading}
              onPull={handlePull}
              onPush={handlePush}
              onGitRefresh={refreshGitData}
            />
          ) : (
            <div className="p-4 flex flex-col gap-2">
              <Skeleton className="h-4 w-full bg-zinc-900" />
              <Skeleton className="h-4 w-3/4 bg-zinc-900" />
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-zinc-800" />

        {/* Center: Editor & Terminal */}
        <ResizablePanel defaultSize={55}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} className="flex flex-col">
              {/* Tab Bar */}
              <div className="flex items-center bg-[#0c0c0e] border-b border-zinc-800 overflow-x-auto no-scrollbar h-9">
                {openFiles.map((file) => (
                  <div
                    key={file.path}
                    onClick={() => setActiveFilePath(file.path)}
                    className={`flex items-center gap-2 px-3 h-full cursor-pointer border-r border-zinc-800 min-w-0 transition-colors ${
                      activeFilePath === file.path
                        ? 'bg-[#18181b] text-white border-t-2 border-t-blue-500'
                        : 'bg-[#0c0c0e] text-zinc-500 hover:text-zinc-300 hover:bg-[#121214]'
                    }`}
                  >
                    <FileCode className={`w-3.5 h-3.5 ${activeFilePath === file.path ? 'text-blue-400' : 'text-zinc-600'}`} />
                    <span className="text-[11px] font-medium truncate max-w-[120px]">
                      {file.path.split('/').pop()}
                    </span>
                    {file.isDirty && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); closeFile(file.path); }}
                      className="ml-1 p-0.5 rounded-sm hover:bg-zinc-700 text-zinc-600 hover:text-zinc-300 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {openFiles.length === 0 && (
                  <div className="px-4 text-[11px] text-zinc-600 flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" /> Select a file to start coding
                  </div>
                )}
              </div>

              {/* Editor Toolbar */}
              <div className="flex items-center justify-between px-4 h-10 bg-[#121214] border-b border-zinc-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-[10px] text-zinc-500 font-mono truncate max-w-[300px]">
                    {activeFilePath || 'No file selected'}
                  </span>
                  {isLoadingFile && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin" />}
                  {gitStatus && (
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest bg-zinc-900 border-zinc-800 text-zinc-400">
                      {gitStatus.branch || 'branch'} ↑ {gitStatus.ahead || 0} ↓ {gitStatus.behind || 0}
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
                    <p className="text-xs font-medium">Select a file from the explorer</p>
                  </div>
                )}
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-zinc-800" />

            {/* Bottom Panel: Terminal */}
            <ResizablePanel defaultSize={30} className="bg-[#0c0c0e]">
              <div className="flex items-center gap-2 px-4 h-8 border-b border-zinc-800 bg-[#09090b]">
                <TerminalIcon className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Terminal</span>
              </div>
                  <div className="h-[calc(100%-32px)]">
                    {workspaceId ? (
                      <TerminalTabs workspaceId={workspaceId} />
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

        {/* Right Panel: Task Instructions */}
        <ResizablePanel defaultSize={27} minSize={20} className="bg-[#09090b] flex flex-col">
          <div className="flex items-center justify-between px-4 h-12 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`w-4 h-4 ${isCompleted ? 'text-emerald-500' : 'text-blue-500'}`} />
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">Active Task</span>
            </div>
            {isCompleted && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Done</Badge>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {!externalDismissed && externalCommits.length > 0 && (
                <div className="mb-4">
                  <ExternalCommitsNotification
                    commits={externalCommits}
                    onReset={handleExternalReset}
                    onDismiss={() => setExternalDismissed(true)}
                  />
                </div>
              )}
              {isGitPanelOpen && null}
              <h2 className="text-lg font-bold text-white mb-4 leading-tight">{task.title}</h2>
              <div className="flex items-center gap-3 mb-6">
                <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter bg-zinc-900 border-zinc-800 text-zinc-400">
                  {task.difficulty}
                </Badge>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-medium">
                  <Clock className="w-3 h-3" />
                  {task.estimated_minutes}m
                </div>
              </div>

              <div className="prose prose-invert prose-sm max-w-none prose-p:text-zinc-400 prose-p:leading-relaxed prose-headings:text-zinc-200 prose-code:text-blue-400 prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>

              {task.hints && task.hints.length > 0 && (
                <div className="mt-8 pt-8 border-t border-zinc-800">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Implementation Hints</h3>
                  <div className="space-y-3">
                    {task.hints.map((hint, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700 transition-colors">
                        <div className="mt-0.5 text-blue-500 group-hover:scale-110 transition-transform">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed italic">{hint}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
            {isCompleted ? (
              <Button disabled className="w-full bg-emerald-600/20 text-emerald-500 border border-emerald-600/20 h-10">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Task Completed
              </Button>
            ) : (
              <Button 
                onClick={handleVerifyTask} 
                disabled={isVerifying}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 h-10 font-bold text-xs uppercase tracking-widest"
              >
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                {isVerifying ? 'Verifying...' : 'Verify Changes'}
              </Button>
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )

  function handleContentChange(newContent: string) {
    if (activeFilePath) updateFileContent(activeFilePath, newContent)
  }
}
