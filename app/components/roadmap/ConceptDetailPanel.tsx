"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type ConceptDetails } from "../../lib/api-roadmap";
import {
  CheckCircle2,
  Clock,
  ChevronRight,
  Book,
  ClipboardList,
  AlertCircle,
  Zap,
} from "lucide-react";

interface ConceptDetailPanelProps {
  conceptDetails: ConceptDetails | null;
  loading: boolean;
  projectId: string;
  conceptProgress: Record<
    string,
    { progress_status: string; content_read?: boolean }
  >;
  taskProgress: Record<string, { progress_status: string }>;
  onStart: () => Promise<void>;
  onComplete: () => Promise<void>;
  onProgressChange: () => Promise<void>;
  isLastConcept: boolean;
}

export default function ConceptDetailPanel({
  conceptDetails,
  loading,
  projectId,
  conceptProgress,
  taskProgress,
}: ConceptDetailPanelProps) {
  const router = useRouter();
  const [showTasks, setShowTasks] = useState(false);

  const requestFullscreenForWorkspace = (taskType: Task["task_type"]) => {
    if (taskType !== "coding") return;
    if (document.fullscreenElement) return;
    try {
      const root = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      };
      if (root.requestFullscreen) {
        void root.requestFullscreen().catch(() => {});
      } else if (root.webkitRequestFullscreen) {
        void Promise.resolve(root.webkitRequestFullscreen()).catch(() => {});
      } else if (root.msRequestFullscreen) {
        void Promise.resolve(root.msRequestFullscreen()).catch(() => {});
      }
    } catch {
      // Ignore
    }
  };

  if (loading || !conceptDetails) {
    return (
      <div className="w-full p-4 bg-zinc-900/50 rounded-xl border border-zinc-800 animate-pulse">
        <div className="space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/4" />
          <div className="h-6 bg-zinc-800 rounded w-3/4" />
          <div className="h-16 bg-zinc-800 rounded w-full" />
          <div className="flex gap-2">
            <div className="h-8 bg-zinc-800 rounded w-24" />
            <div className="h-8 bg-zinc-800 rounded w-24" />
          </div>
        </div>
      </div>
    );
  }

  const { concept, tasks } = conceptDetails;

  // Debug: Log concept details to help diagnose rendering issues
  if (process.env.NODE_ENV === "development") {
    console.log("📄 ConceptDetailPanel received:", {
      concept_id: concept.concept_id,
      title: concept.title,
      generated_status: concept.generated_status,
      has_content: !!concept.content,
      content_length: concept.content?.length || 0,
      tasks_count: tasks.length,
      tasks: tasks.map((t) => ({
        id: t.task_id,
        title: t.title,
        generated_status: t.generated_status,
      })),
    });
  }
  const progress = conceptProgress[concept.concept_id];
  const isContentRead = progress?.content_read || false;
  const completedTasksCount = tasks.filter(
    (t) => taskProgress[t.task_id]?.progress_status === "done"
  ).length;
  const totalTasks = tasks.length;

  // Calculate Progress Percentage
  const totalItems = (concept.content ? 1 : 0) + totalTasks;
  const completedItems = (isContentRead ? 1 : 0) + completedTasksCount;
  const progressPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const allTasksDone = totalTasks === 0 || completedTasksCount === totalTasks;
  const isReadyToComplete = isContentRead && allTasksDone;

  const handleContentClick = () => {
    router.push(`/docs/${concept.concept_id}?project=${projectId}`);
  };

  const handleTaskClick = (taskId: string, taskType: Task["task_type"]) => {
    requestFullscreenForWorkspace(taskType);
    router.push(`/workspace?task=${taskId}`);
  };

  const getTaskStatusIcon = (taskId: string) => {
    const status = taskProgress[taskId]?.progress_status;
    if (status === "done") {
      return (
        <div className="w-5 h-5 bg-emerald-500/10 rounded-full flex items-center justify-center border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
        </div>
      );
    }
    if (status === "doing") {
      return (
        <div className="w-5 h-5 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
        </div>
      );
    }
    return (
      <div className="w-5 h-5 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700">
        <div className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
      </div>
    );
  };

  const getDifficultyBadge = (difficulty: string | null) => {
    const colors = {
      easy: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      hard: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    if (!difficulty) {
      return colors.medium;
    }
    return colors[difficulty as keyof typeof colors] || colors.medium;
  };

  return (
    <div className="w-full bg-[#18181b] rounded-xl border border-orange-500/30 shadow-2xl shadow-orange-500/5 overflow-hidden">
      <ScrollArea className="w-full">
        <div className="p-5 min-w-[380px]">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold uppercase tracking-widest bg-zinc-950 border-zinc-800 text-zinc-500 h-5 px-1.5"
                  >
                    Concept {concept.order_index}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
                    <Clock className="w-3 h-3" />
                    {concept.estimated_minutes}m
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-2 leading-tight">
                  {concept.title}
                </h3>
                {concept.description && (
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mb-4">
                    {concept.description}
                  </p>
                )}
              </div>
            </div>

            {/* Progress Section */}
            <div className="pt-4 border-t border-zinc-800/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-md ${isReadyToComplete ? "bg-emerald-500/10" : "bg-blue-500/10"}`}
                  >
                    {isReadyToComplete ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Zap className="w-3.5 h-3.5 text-blue-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    {isReadyToComplete ? "Ready to Finish" : "Concept Progress"}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-black tracking-tight ${isReadyToComplete ? "text-emerald-500 animate-pulse" : "text-zinc-200"}`}
                >
                  {progressPercentage}%
                </span>
              </div>
              <Progress
                value={progressPercentage}
                className="h-1.5 bg-zinc-800"
              />
            </div>
          </div>

          {/* Content and Tasks Boxes */}
          <div className="space-y-3">
            {/* Content Box */}
            {/* Debug: Show message if content is missing but status suggests it should exist */}
            {!concept.content && (
              <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-[11px] text-yellow-500 font-medium mb-2">
                  ⚠️ No content available for this concept.
                </p>
                <p className="text-[10px] text-yellow-500/70">
                  Status: {concept.generated_status} | Concept ID:{" "}
                  {concept.concept_id}
                </p>
                <p className="text-[10px] text-yellow-500/70 mt-1">
                  Check backend logs or use debug endpoint: /api/roadmap/
                  {projectId}/concept/{concept.concept_id}/debug
                </p>
              </div>
            )}
            {concept.content && (
              <button
                onClick={handleContentClick}
                className="w-full p-3.5 flex items-center justify-between bg-zinc-900/50 hover:bg-zinc-800/80 border border-zinc-800 rounded-xl transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                      isContentRead
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : "bg-blue-500/10 border-blue-500/20"
                    }`}
                  >
                    <Book
                      className={`w-5 h-5 ${isContentRead ? "text-emerald-500" : "text-blue-500"}`}
                    />
                  </div>
                  <div className="text-left">
                    <h4 className="text-[13px] font-bold text-white group-hover:text-blue-400 transition-colors">
                      Learning Content
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      {isContentRead
                        ? "Documentation Read"
                        : "Click to start reading"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isContentRead ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </div>
              </button>
            )}

            {/* Tasks Box */}
            {/* Debug: Show message if tasks are missing */}
            {tasks.length === 0 && (
              <div className="w-full p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-[11px] text-yellow-500 font-medium mb-2">
                  ⚠️ No tasks found for this concept.
                </p>
                <p className="text-[10px] text-yellow-500/70">
                  Status: {concept.generated_status} | Concept ID:{" "}
                  {concept.concept_id}
                </p>
                <p className="text-[10px] text-yellow-500/70 mt-1">
                  Check backend logs or use debug endpoint: /api/roadmap/
                  {projectId}/concept/{concept.concept_id}/debug
                </p>
              </div>
            )}
            {tasks.length > 0 && (
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <button
                  onClick={() => setShowTasks(!showTasks)}
                  className="w-full p-3.5 flex items-center justify-between hover:bg-zinc-800/50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center border transition-colors ${
                        allTasksDone
                          ? "bg-emerald-500/10 border-emerald-500/20"
                          : "bg-purple-500/10 border-purple-500/20"
                      }`}
                    >
                      <ClipboardList
                        className={`w-5 h-5 ${allTasksDone ? "text-emerald-500" : "text-purple-400"}`}
                      />
                    </div>
                    <div className="text-left">
                      <h4 className="text-[13px] font-bold text-white group-hover:text-purple-400 transition-colors">
                        Tasks
                      </h4>
                      <p className="text-[10px] text-zinc-500 font-medium">
                        {
                          tasks.filter(
                            (t) =>
                              taskProgress[t.task_id]?.progress_status ===
                              "done"
                          ).length
                        }{" "}
                        of {tasks.length} completed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChevronRight
                      className={`w-4 h-4 text-zinc-600 group-hover:text-purple-400 transition-all ${showTasks ? "rotate-90" : ""}`}
                    />
                  </div>
                </button>

                {showTasks && (
                  <div className="bg-zinc-950/30 border-t border-zinc-800/50 divide-y divide-zinc-800/30">
                    <ScrollArea className="max-h-[300px]">
                      {tasks.map((task) => (
                        <button
                          key={task.task_id}
                          onClick={() =>
                            handleTaskClick(task.task_id, task.task_type)
                          }
                          className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-zinc-800/50 transition-all text-left group"
                        >
                          {getTaskStatusIcon(task.task_id)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="text-[12px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                                {task.title}
                              </h5>
                              <Badge
                                variant="outline"
                                className={`text-[9px] font-bold uppercase tracking-widest h-4 px-1 ${getDifficultyBadge(task.difficulty)}`}
                              >
                                {task.difficulty || "medium"}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-zinc-500 font-medium whitespace-nowrap">
                              {task.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold whitespace-nowrap flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {task.estimated_minutes}m
                          </div>
                        </button>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Helper Footer */}
          {!allTasksDone && (
            <div className="mt-4 flex items-center gap-2 p-2.5 bg-zinc-950/50 rounded-lg border border-zinc-800/50">
              <AlertCircle className="w-3.5 h-3.5 text-zinc-600" />
              <p className="text-[10px] text-zinc-500 font-medium">
                Complete all tasks to finish this concept.
              </p>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" className="bg-zinc-800/20" />
      </ScrollArea>
    </div>
  );
}
