import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowDown, ArrowUp, GitBranch, GitCommit, X } from 'lucide-react'
import type { GitCommitEntry, GitStatusResponse } from '../../lib/api-git'

interface GitPanelProps {
  status: GitStatusResponse | null
  commits: GitCommitEntry[]
  isLoading?: boolean
  onPull: () => void
  onPush: () => void
  onRefresh: () => void
  onClose?: () => void
}

export default function GitPanel({
  status,
  commits,
  isLoading,
  onPull,
  onPush,
  onRefresh,
  onClose
}: GitPanelProps) {
  const fileCount = useMemo(() => {
    if (!status) return 0
    return (
      (status.modified?.length || 0) +
      (status.staged?.length || 0) +
      (status.untracked?.length || 0)
    )
  }, [status])

  const isClean = fileCount === 0 && (status?.ahead || 0) === 0 && (status?.behind || 0) === 0

  return (
    <Card className="bg-zinc-900/40 border-zinc-800">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-zinc-400" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
              Git Status
            </span>
          </div>
          <div className="flex items-center gap-1">
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7 text-zinc-500 hover:text-white"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 px-2 text-[10px] text-zinc-400 hover:text-white"
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-[11px] text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Branch</span>
            <span className="font-mono">{status?.branch || 'unknown'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Changes</span>
            <span className="font-mono">{fileCount}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Remote</span>
            <span className="font-mono">
              ↑ {status?.ahead || 0} / ↓ {status?.behind || 0}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPull}
            disabled={isLoading}
            className="h-8 flex-1 border-zinc-800 text-zinc-300 hover:text-white"
          >
            <ArrowDown className="w-3.5 h-3.5 mr-1.5" />
            Pull
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onPush}
            disabled={isLoading}
            className="h-8 flex-1 border-zinc-800 text-zinc-300 hover:text-white"
          >
            <ArrowUp className="w-3.5 h-3.5 mr-1.5" />
            Push
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[9px] uppercase tracking-widest ${isClean ? 'text-emerald-400 border-emerald-500/20' : 'text-yellow-500 border-yellow-500/20'}`}
          >
            {isClean ? 'Clean' : 'Changes'}
          </Badge>
          {isLoading && <span className="text-[10px] text-zinc-500">Updating…</span>}
        </div>

        <div className="border-t border-zinc-800 pt-3 space-y-2">
          <div className="flex items-center gap-2">
            <GitCommit className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Recent Commits
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {commits.length === 0 && (
              <div className="text-[11px] text-zinc-600">No commits yet</div>
            )}
            {commits.map((commit) => (
              <div key={commit.sha} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[11px] text-zinc-300 truncate">{commit.message}</div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {commit.sha.slice(0, 7)}
                  </div>
                </div>
                <span className="text-[10px] text-zinc-600 whitespace-nowrap">
                  {commit.author_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
