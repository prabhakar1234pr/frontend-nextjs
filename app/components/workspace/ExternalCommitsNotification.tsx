"use client"

import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"
import type { GitCommitEntry } from "../../lib/api-git"

interface ExternalCommitsNotificationProps {
  commits: GitCommitEntry[]
  onReset: () => void
  onDismiss: () => void
}

export default function ExternalCommitsNotification({
  commits,
  onReset,
  onDismiss
}: ExternalCommitsNotificationProps) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
      <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5" />
      <div className="flex-1">
        <div className="text-[12px] font-semibold text-yellow-500">
          External commits detected
        </div>
        <div className="text-[11px] text-zinc-400">
          {commits.length} commit(s) were pushed outside GitGuide.
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" onClick={onReset} className="h-7 bg-yellow-500 text-zinc-900 hover:bg-yellow-400">
            Reset to platform
          </Button>
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-7 text-zinc-400">
            Dismiss
          </Button>
        </div>
      </div>
    </div>
  )
}
