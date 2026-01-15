"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface UncommittedChangesDialogProps {
  open: boolean
  files: string[]
  onClose: () => void
  onAction: (action: 'commit' | 'stash' | 'discard' | 'cancel') => void
}

export default function UncommittedChangesDialog({
  open,
  files,
  onClose,
  onAction
}: UncommittedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="text-white">Uncommitted changes</DialogTitle>
          <DialogDescription className="text-zinc-400">
            You have local changes. Choose how to proceed before pulling.
          </DialogDescription>
        </DialogHeader>

        <div className="text-[11px] text-zinc-500 space-y-1 max-h-40 overflow-y-auto">
          {files.map((file) => (
            <div key={file} className="font-mono truncate">{file}</div>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onAction('cancel')} className="text-zinc-400">
            Cancel
          </Button>
          <Button variant="outline" onClick={() => onAction('stash')} className="border-zinc-700">
            Stash
          </Button>
          <Button variant="outline" onClick={() => onAction('discard')} className="border-red-500/30 text-red-400 hover:text-red-300">
            Discard
          </Button>
          <Button onClick={() => onAction('commit')} className="bg-blue-600 hover:bg-blue-500">
            Auto-Commit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
