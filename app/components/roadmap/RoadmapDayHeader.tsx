"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Brain,
  Bug,
  CalendarDays,
  Code2,
  Database,
  FlaskConical,
  Gamepad2,
  GitBranch,
  Globe,
  GraduationCap,
  Hammer,
  KeyRound,
  Layers,
  ListChecks,
  Monitor,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";
import { type RoadmapDay } from "../../lib/api-roadmap";

interface RoadmapDayHeaderProps {
  days: RoadmapDay[];
  selectedDayId: string | null;
  onSelectDay: (dayId: string) => void;
  progressMap: Record<string, { progress_status: string }>;
}

export default function RoadmapDayHeader({
  days,
  selectedDayId,
  onSelectDay,
  progressMap,
}: RoadmapDayHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const renderDayIcon = (dayNumber: number, className: string) => {
    const idx = Math.abs(dayNumber) % 20;
    switch (idx) {
      case 0:
        return <BookOpen className={className} />;
      case 1:
        return <GitBranch className={className} />;
      case 2:
        return <Code2 className={className} />;
      case 3:
        return <Bug className={className} />;
      case 4:
        return <Layers className={className} />;
      case 5:
        return <Database className={className} />;
      case 6:
        return <KeyRound className={className} />;
      case 7:
        return <ShieldCheck className={className} />;
      case 8:
        return <Globe className={className} />;
      case 9:
        return <Search className={className} />;
      case 10:
        return <ListChecks className={className} />;
      case 11:
        return <Hammer className={className} />;
      case 12:
        return <FlaskConical className={className} />;
      case 13:
        return <Gamepad2 className={className} />;
      case 14:
        return <Monitor className={className} />;
      case 15:
        return <Rocket className={className} />;
      case 16:
        return <Sparkles className={className} />;
      case 17:
        return <Wand2 className={className} />;
      case 18:
        return <Brain className={className} />;
      case 19:
      default:
        return <GraduationCap className={className} />;
    }
  };

  const selectedDay = useMemo(() => {
    if (days.length === 0) return null;
    return days.find((d) => d.day_id === selectedDayId) ?? days[0];
  }, [days, selectedDayId]);

  const getDayStatus = (day: RoadmapDay) => {
    const progress = progressMap[day.day_id];
    if (progress) return progress.progress_status;

    if (day.day_number === 0) return "todo";

    const previousDay = days.find((d) => d.day_number === day.day_number - 1);
    if (previousDay) {
      const previousProgress = progressMap[previousDay.day_id];
      if (previousProgress?.progress_status === "done") return "todo";
    }

    return "locked";
  };

  const isDayClickable = (day: RoadmapDay) => {
    const dayStatus = getDayStatus(day);
    return (
      dayStatus !== "locked" &&
      (day.generated_status === "generated" ||
        day.generated_status === "pending" ||
        day.generated_status === "generating")
    );
  };

  const getDayIndicator = (day: RoadmapDay) => {
    const status = getDayStatus(day);
    const isGenerating = day.generated_status === "generating";

    if (isGenerating) {
      return (
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      );
    }

    switch (status) {
      case "done":
        return (
          <svg
            className="w-5 h-5 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "doing":
        return (
          <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
        );
      case "locked":
        return (
          <svg
            className="w-5 h-5 text-zinc-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  if (!selectedDay) return null;

  const totalDays = days.length;
  const dayNumberDisplay = selectedDay.day_number;

  return (
    <>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-white">
              Learning Roadmap
            </h2>
            <span className="text-xs text-zinc-400">
              Day {dayNumberDisplay} of {totalDays}
            </span>
          </div>

          <div className="mt-2">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/40">
                {renderDayIcon(selectedDay.day_number, "h-5 w-5 text-zinc-200")}
              </div>
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-white leading-snug break-words">
                  {selectedDay.theme}
                </h3>
                {selectedDay.description && (
                  <p className="mt-1 text-sm text-zinc-300 leading-relaxed break-words">
                    {selectedDay.description}
                  </p>
                )}
              </div>
            </div>
            {selectedDay.description && (
              <div className="sr-only">{selectedDay.description}</div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-950/60 px-3 py-2 text-xs font-semibold text-zinc-100 shadow-sm hover:bg-zinc-900/60 hover:border-zinc-600 transition"
          aria-label="Open all days"
        >
          <CalendarDays className="h-4 w-4 text-zinc-200" aria-hidden="true" />
          All days
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
            aria-label="Close days panel"
          />

          <div className="absolute right-0 top-0 h-full w-[360px] max-w-[85vw] border-l border-zinc-800 bg-zinc-950">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">All days</p>
                <p className="text-xs text-zinc-400">
                  Select a day to view details
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-zinc-300 hover:text-white"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="h-[calc(100%-53px)] overflow-y-auto p-3">
              <div className="space-y-2">
                {days
                  .slice()
                  .sort((a, b) => a.day_number - b.day_number)
                  .map((day) => {
                    const isSelected = day.day_id === selectedDay.day_id;
                    const clickable = isDayClickable(day);
                    const dayNum = day.day_number;

                    return (
                      <button
                        key={day.day_id}
                        type="button"
                        disabled={!clickable}
                        onClick={() => {
                          if (!clickable) return;
                          onSelectDay(day.day_id);
                          setIsOpen(false);
                        }}
                        className={[
                          "w-full rounded-lg border px-3 py-2 text-left transition",
                          isSelected
                            ? "border-white/20 bg-white/5"
                            : "border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900/50",
                          clickable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-60",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 gap-3">
                            <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900/40">
                              {renderDayIcon(
                                day.day_number,
                                "h-4 w-4 text-zinc-200"
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs text-zinc-400">
                                Day {dayNum}
                              </p>
                              <p className="mt-0.5 text-sm font-semibold text-white break-words">
                                {day.theme}
                              </p>
                              {day.description && (
                                <p className="mt-1 text-xs text-zinc-400 break-words">
                                  {day.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-1 flex-shrink-0">
                            {getDayIndicator(day)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
