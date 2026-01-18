"use client";

import { CheckCircle2, Clock, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Task } from "../../lib/api-roadmap";

interface TaskPanelProps {
  task: Task;
  isCompleted: boolean;
  isVerifying: boolean;
  onVerifyTask: () => void;
}

export default function TaskPanel({
  task,
  isCompleted,
  isVerifying,
  onVerifyTask,
}: TaskPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-4 leading-tight">
            {task.title}
          </h2>
          <div className="flex items-center gap-3 mb-6">
            <Badge
              variant="outline"
              className="text-[10px] uppercase font-bold tracking-tighter bg-zinc-900 border-zinc-800 text-zinc-400"
            >
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

          {task.hints && Array.isArray(task.hints) && task.hints.length > 0 && (
            <div className="mt-8 pt-8 border-t border-zinc-800">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">
                Implementation Hints
              </h3>
              <div className="space-y-3">
                {task.hints.map((hint, i) => (
                  <div
                    key={i}
                    className="flex gap-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 group hover:border-zinc-700 transition-colors"
                  >
                    <div className="mt-0.5 text-blue-500 group-hover:scale-110 transition-transform">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                      {hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e] shrink-0 space-y-3">
        {/* Active Task Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2
              className={`w-4 h-4 ${isCompleted ? "text-emerald-500" : "text-blue-500"}`}
            />
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-widest">
              ACTIVE TASK
            </span>
          </div>
          {isCompleted && (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px]">
              Done
            </Badge>
          )}
        </div>

        {/* Verify Button */}
        {isCompleted ? (
          <Button
            disabled
            className="w-full bg-emerald-600/20 text-emerald-500 border border-emerald-600/20 h-10"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Task Completed
          </Button>
        ) : (
          <Button
            onClick={onVerifyTask}
            disabled={isVerifying}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20 h-10 font-bold text-xs uppercase tracking-widest"
          >
            {isVerifying ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            {isVerifying ? "Verifying..." : "Verify Changes"}
          </Button>
        )}
      </div>
    </div>
  );
}
