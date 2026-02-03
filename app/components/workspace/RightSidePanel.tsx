"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, GitBranch, MessageCircle } from "lucide-react";
import GitPanel from "./GitPanel";
import TaskPanel from "./TaskPanel";
import ChatPanel from "./ChatPanel";
import type { Task, Concept } from "../../lib/api-roadmap";
import type { TaskVerificationResponse } from "../../lib/api-verification";
import type {
  GitCommitEntry,
  GitStatusResponse,
  CommitGraphEntry,
  BranchInfo,
} from "../../lib/api-git";

interface RightSidePanelProps {
  // Task props
  task: Task;
  isCompleted: boolean;
  isVerifying: boolean;
  onVerifyTask: () => void;
  verificationResult: TaskVerificationResponse | null;
  nextNavigation?: {
    type: "task" | "concept" | "day" | "complete";
    taskId?: string;
    taskType?: Task["task_type"];
    conceptId?: string;
    dayNumber?: number;
    projectId: string;
  } | null;

  // Git props
  gitStatus: GitStatusResponse | null;
  gitCommits: GitCommitEntry[];
  gitLoading: boolean;
  commitGraph?: CommitGraphEntry[];
  commitBranches?: Record<string, string>;
  branches?: BranchInfo[];
  conflicts?: string[];
  onPull: () => void;
  onPush: () => void;
  onGitRefresh: () => void;
  onStage?: (files?: string[]) => Promise<void>;
  onUnstage?: (files?: string[]) => Promise<void>;
  onViewDiff?: (filePath: string, staged: boolean) => void;
  onCreateBranch?: (name: string, startPoint?: string) => Promise<void>;
  onCheckoutBranch?: (name: string, create?: boolean) => Promise<void>;
  onDeleteBranch?: (name: string, force?: boolean) => Promise<void>;
  onResolveConflict?: (
    filePath: string,
    side: "ours" | "theirs" | "both",
    content?: string
  ) => Promise<void>;
  onGetConflictContent?: (filePath: string) => Promise<string>;
  onWriteFile?: (filePath: string, content: string) => Promise<void>;
  onMerge?: (branch: string, noFF: boolean, message?: string) => Promise<void>;
  onAbortMerge?: () => Promise<void>;
  onCommitClick?: (sha: string) => void;
  onResetToCommit?: (sha: string) => Promise<void>;

  // Chat props
  workspaceId?: string;
  projectId?: string;
  concept: Concept;
  userCode: Array<{ path: string; content: string }>;
}

export default function RightSidePanel({
  task,
  isCompleted,
  isVerifying,
  onVerifyTask,
  verificationResult,
  nextNavigation,
  gitStatus,
  gitCommits,
  gitLoading,
  commitGraph = [],
  commitBranches = {},
  branches = [],
  conflicts = [],
  onPull,
  onPush,
  onGitRefresh,
  onStage,
  onUnstage,
  onViewDiff,
  onCreateBranch,
  onCheckoutBranch,
  onDeleteBranch,
  onResolveConflict,
  onGetConflictContent,
  onWriteFile,
  onMerge,
  onAbortMerge,
  onCommitClick,
  onResetToCommit,
  workspaceId,
  projectId,
  concept,
  userCode,
}: RightSidePanelProps) {
  const [activeTab, setActiveTab] = useState<"task" | "git" | "chat">("task");

  return (
    <div className="bg-[#09090b] flex flex-col h-full">
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "task" | "git" | "chat")}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="grid w-full grid-cols-3 h-10 bg-zinc-900/50 border-b border-zinc-800 rounded-none shrink-0">
          <TabsTrigger
            value="task"
            className="text-[10px] font-medium uppercase tracking-wider data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 flex items-center justify-center gap-1.5 px-2"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            Task
          </TabsTrigger>
          <TabsTrigger
            value="git"
            className="text-[10px] font-medium uppercase tracking-wider data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 flex items-center justify-center gap-1.5 px-2"
          >
            <GitBranch className="w-3.5 h-3.5 shrink-0" />
            Git
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="text-[10px] font-medium uppercase tracking-wider data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 flex items-center justify-center gap-1.5 px-2"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            Chat
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="task"
          className="flex-1 min-h-0 overflow-hidden mt-0"
        >
          <TaskPanel
            task={task}
            isCompleted={isCompleted}
            isVerifying={isVerifying}
            onVerifyTask={onVerifyTask}
            verificationResult={verificationResult}
            nextNavigation={nextNavigation}
          />
        </TabsContent>

        <TabsContent
          value="git"
          className="flex-1 min-h-0 overflow-hidden mt-0"
        >
          <GitPanel
            status={gitStatus}
            commits={gitCommits}
            isLoading={gitLoading}
            onPull={onPull}
            onPush={onPush}
            onRefresh={onGitRefresh}
            onStage={onStage}
            onUnstage={onUnstage}
            onViewDiff={onViewDiff}
            commitGraph={commitGraph}
            commitBranches={commitBranches}
            onCommitClick={onCommitClick}
            onResetToCommit={onResetToCommit}
            branches={branches}
            onCreateBranch={onCreateBranch}
            onCheckoutBranch={onCheckoutBranch}
            onDeleteBranch={onDeleteBranch}
            conflicts={conflicts}
            onResolveConflict={onResolveConflict}
            onGetConflictContent={onGetConflictContent}
            onWriteFile={onWriteFile}
            onMerge={onMerge}
            onAbortMerge={onAbortMerge}
          />
        </TabsContent>

        <TabsContent
          value="chat"
          className="flex-1 min-h-0 overflow-hidden mt-0"
        >
          <ChatPanel
            task={task}
            concept={concept}
            verificationResult={verificationResult}
            userCode={userCode}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
