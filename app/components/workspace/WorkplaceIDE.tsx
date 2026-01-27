"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type TaskDetails, type Task } from "../../lib/api-roadmap";
import CodeEditor from "./CodeEditor";
import GitHubTaskPanel from "./GitHubTaskPanel";
import {
  ChevronLeft,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface NextNavigation {
  type: "task" | "concept" | "day" | "complete";
  taskId?: string;
  conceptId?: string;
  dayNumber?: number;
  projectId: string;
}

interface WorkplaceIDEProps {
  taskDetails: TaskDetails;
  onProgressChange?: () => Promise<void>;
  nextTaskId?: string | null;
  nextNavigation?: NextNavigation | null;
  initialCompleted?: boolean;
}

const getTaskTypeStyle = (taskType: Task["task_type"]) => {
  switch (taskType) {
    case "coding":
      return {
        bg: "bg-blue-500/10",
        text: "text-blue-400",
        border: "border-blue-500/20",
      };
    case "github_profile":
    case "create_repo":
    case "github_connect":
    case "verify_commit":
      return {
        bg: "bg-orange-500/10",
        text: "text-orange-400",
        border: "border-orange-500/20",
      };
    default:
      return {
        bg: "bg-zinc-500/10",
        text: "text-zinc-400",
        border: "border-zinc-500/20",
      };
  }
};

export default function WorkplaceIDE({
  taskDetails,
  initialCompleted,
  onProgressChange,
  nextTaskId,
  nextNavigation,
}: WorkplaceIDEProps) {
  const { task, concept, day, project } = taskDetails;
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const didAutoEnterFullscreenRef = useRef(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      const el = document.fullscreenElement;
      setIsFullscreen(!!el);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    // Best-effort auto-enter fullscreen when user enters Workspace IDE.
    // Some browsers may block this unless it happens from a user gesture;
    // we also request fullscreen on the task-click navigation paths.
    if (didAutoEnterFullscreenRef.current) return;
    didAutoEnterFullscreenRef.current = true;

    if (document.fullscreenElement) return;
    const el = containerRef.current;
    if (!el) return;

    try {
      const anyEl = el as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      };
      if (anyEl.requestFullscreen) {
        void anyEl.requestFullscreen().catch(() => {});
      } else if (anyEl.webkitRequestFullscreen) {
        void Promise.resolve(anyEl.webkitRequestFullscreen()).catch(() => {});
      } else if (anyEl.msRequestFullscreen) {
        void Promise.resolve(anyEl.msRequestFullscreen()).catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }

      const el = containerRef.current;
      if (!el) return;

      // Standard Fullscreen API
      if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
      }

      // Fallbacks (older WebKit/MS) - best-effort
      const anyEl = el as unknown as {
        webkitRequestFullscreen?: () => Promise<void> | void;
        msRequestFullscreen?: () => Promise<void> | void;
      };
      if (anyEl.webkitRequestFullscreen) {
        await anyEl.webkitRequestFullscreen();
        return;
      }
      if (anyEl.msRequestFullscreen) {
        await anyEl.msRequestFullscreen();
      }
    } catch {
      // Ignore (browser may block without a user gesture)
    }
  };

  const handleComplete = async () => {
    setIsCompleted(true);
    if (onProgressChange) {
      await onProgressChange();
    }
  };

  const taskStyle = getTaskTypeStyle(task.task_type);

  const renderWorkspace = () => {
    switch (task.task_type) {
      case "coding":
        return (
          <CodeEditor
            task={task}
            concept={concept}
            projectId={project.project_id}
            onComplete={handleComplete}
            initialCompleted={isCompleted}
          />
        );

      case "github_profile":
      case "create_repo":
      case "github_connect":
      case "verify_commit":
        return (
          <GitHubTaskPanel
            task={task}
            project={project}
            onComplete={handleComplete}
            initialCompleted={isCompleted}
            nextTaskId={nextTaskId}
            nextNavigation={nextNavigation}
          />
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                Task type not supported yet
              </p>
              <p className="text-sm font-mono opacity-50">{task.task_type}</p>
            </div>
          </div>
        );
    }
  };

  // For coding tasks, use full-screen layout
  if (task.task_type === "coding") {
    return (
      <div ref={containerRef} className="h-screen bg-[#09090b] flex flex-col">
        {/* Minimal Nav Bar */}
        <div className="h-10 bg-[#0c0c0e] border-b border-zinc-800 flex items-center px-4 gap-4">
          <Link
            href={`/project/${project.project_id}`}
            className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 text-[11px] font-medium transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Roadmap
          </Link>
          <div className="h-4 w-px bg-zinc-800"></div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="h-5 px-1.5 text-[9px] uppercase tracking-widest font-bold bg-zinc-900 border-zinc-800 text-zinc-500"
            >
              Day {day.day_number}
            </Badge>
            <span className="text-[11px] font-semibold text-zinc-400 truncate max-w-[200px]">
              {concept.title}
            </span>
          </div>

          <div className="ml-auto flex items-center">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="inline-flex items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/30 px-2 py-1 text-zinc-300 hover:text-white hover:bg-zinc-900/60 transition"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Maximize2 className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Full Height Workspace */}
        <div className="flex-1 overflow-hidden">{renderWorkspace()}</div>
      </div>
    );
  }

  // For other tasks (GitHub tasks), use a cleaner document-style layout
  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-[#09090b] flex flex-col overflow-y-auto"
    >
      {/* Progress Bar (Simulated or based on scroll) */}
      <div className="fixed top-0 left-0 right-0 h-0.5 bg-zinc-800 z-50">
        <div className="h-full bg-blue-600 transition-all duration-300 w-full opacity-30" />
      </div>

      <main className="flex-1 max-w-[720px] mx-auto w-full px-8 py-20">
        {/* Elegant Header */}
        <div className="mb-12 border-b border-zinc-800 pb-10">
          <Link
            href={`/project/${project.project_id}`}
            className="inline-flex items-center gap-2 text-zinc-500 hover:text-zinc-200 text-[11px] font-bold uppercase tracking-widest mb-8 group transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Roadmap
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <Badge
              className={`${taskStyle.bg} ${taskStyle.text} border ${taskStyle.border} uppercase text-[9px] font-bold tracking-[0.15em] px-2 py-0.5`}
            >
              {task.task_type.replace("_", " ")}
            </Badge>
            {isCompleted && (
              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 uppercase text-[9px] font-bold tracking-[0.15em] px-2 py-0.5">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Complete
              </Badge>
            )}
          </div>

          <h1
            className="text-[2.75rem] leading-[1.1] font-bold text-white tracking-tight mb-6"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {task.title}
          </h1>

          <div className="flex items-center justify-between">
            <p className="text-zinc-500 text-sm font-medium">
              Day {day.day_number} <span className="mx-2 text-zinc-800">•</span>{" "}
              {concept.title}
            </p>
            {task.estimated_minutes && (
              <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 uppercase tracking-tighter">
                <Clock className="w-3.5 h-3.5" />~{task.estimated_minutes} min
              </div>
            )}
          </div>
        </div>

        {/* Task Content Area */}
        <div className="prose prose-invert prose-blue max-w-none prose-headings:font-serif prose-p:text-zinc-400 prose-p:leading-relaxed">
          {renderWorkspace()}
        </div>

        {/* End of content spacing */}
        <div className="h-40" />
      </main>

      {/* Action Footer (Matches Doc style) */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[#09090b]/80 backdrop-blur-md border-t border-zinc-800">
        <div className="max-w-[720px] mx-auto px-8 py-4 flex items-center justify-between">
          <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            {isCompleted ? (
              <span className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-4 h-4" />
                Task Completed
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Awaiting Action
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isCompleted && nextNavigation && (
              <Button
                asChild
                className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-full px-6 h-10 font-bold text-xs uppercase tracking-widest"
              >
                <Link
                  href={
                    nextNavigation.type === "task"
                      ? `/workspace?task=${nextNavigation.taskId}`
                      : `/project/${project.project_id}`
                  }
                  onClick={() => {
                    // If user exited fullscreen, re-enter on next task navigation.
                    if (nextNavigation.type !== "task") return;
                    if (document.fullscreenElement) return;
                    const root = document.documentElement as unknown as {
                      requestFullscreen?: () => Promise<void>;
                      webkitRequestFullscreen?: () => Promise<void> | void;
                      msRequestFullscreen?: () => Promise<void> | void;
                    };
                    try {
                      if (root.requestFullscreen) {
                        void root.requestFullscreen().catch(() => {});
                      } else if (root.webkitRequestFullscreen) {
                        void Promise.resolve(
                          root.webkitRequestFullscreen()
                        ).catch(() => {});
                      } else if (root.msRequestFullscreen) {
                        void Promise.resolve(root.msRequestFullscreen()).catch(
                          () => {}
                        );
                      }
                    } catch {
                      // Ignore
                    }
                  }}
                >
                  Continue →
                </Link>
              </Button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
