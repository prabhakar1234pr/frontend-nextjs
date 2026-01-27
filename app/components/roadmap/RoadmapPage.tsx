"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  useRoadmap,
  useDayDetails,
  useConceptDetails,
} from "../../hooks/useRoadmap";
import { useProgress } from "../../hooks/useProgress";
import RoadmapDayHeader from "./RoadmapDayHeader";
import KanbanBoard from "./KanbanBoard";

interface RoadmapPageProps {
  projectId: string;
}

export default function RoadmapPage({ projectId }: RoadmapPageProps) {
  const {
    days,
    loading: roadmapLoading,
    error: roadmapError,
    generationStatus,
  } = useRoadmap(projectId);
  const {
    progress,
    current,
    loading: progressLoading,
    refetch: refetchProgress,
    startConcept: startConceptProgress,
    completeConcept: completeConceptProgress,
  } = useProgress(projectId);

  // Refresh progress when component becomes visible (user navigates back to roadmap)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchProgress();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [refetchProgress]);

  // Event-driven updates: Listen for progress changes from task/concept completion
  useEffect(() => {
    const handleProgressUpdate = () => {
      refetchProgress();
    };

    // Listen for custom events dispatched when tasks/concepts are completed
    window.addEventListener("progress:task:completed", handleProgressUpdate);
    window.addEventListener("progress:concept:completed", handleProgressUpdate);
    window.addEventListener("progress:content:read", handleProgressUpdate);

    return () => {
      window.removeEventListener(
        "progress:task:completed",
        handleProgressUpdate
      );
      window.removeEventListener(
        "progress:concept:completed",
        handleProgressUpdate
      );
      window.removeEventListener("progress:content:read", handleProgressUpdate);
    };
  }, [refetchProgress]);

  // Compute initial day ID
  const getInitialDayId = useCallback(() => {
    if (days.length > 0) {
      const currentDay = current?.current_day;
      if (currentDay) {
        return currentDay.day_id;
      } else {
        const firstGenerated = days.find(
          (d) => d.generated_status === "generated"
        );
        if (firstGenerated) {
          return firstGenerated.day_id;
        } else {
          return days[0].day_id;
        }
      }
    }
    return null;
  }, [days, current]);

  // Compute initial day ID using useMemo to avoid synchronous setState
  const initialDayId = useMemo(() => getInitialDayId(), [getInitialDayId]);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(
    initialDayId
  );
  const hasInitializedDayId = useRef(false);

  // Sync selectedDayId when days/current change (only if not set by user)
  const prevDaysLength = useRef(days.length);
  useEffect(() => {
    if (days.length > 0 && days.length !== prevDaysLength.current) {
      const newDayId = getInitialDayId();
      if (newDayId && !selectedDayId && !hasInitializedDayId.current) {
        // Use setTimeout to defer state update and avoid synchronous setState
        const timeoutId = setTimeout(() => {
          setSelectedDayId(newDayId);
          hasInitializedDayId.current = true;
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
    prevDaysLength.current = days.length;
  }, [days.length, getInitialDayId, selectedDayId]);

  const { dayDetails } = useDayDetails(projectId, selectedDayId);

  // Compute initial concept ID
  const getInitialConceptId = useCallback(() => {
    if (dayDetails && dayDetails.concepts.length > 0) {
      const currentConcept = current?.current_concept;
      if (currentConcept) {
        return currentConcept.concept_id;
      } else {
        return dayDetails.concepts[0].concept_id;
      }
    }
    return null;
  }, [dayDetails, current]);

  // Compute initial concept ID using useMemo
  const initialConceptId = useMemo(
    () => getInitialConceptId(),
    [getInitialConceptId]
  );
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(
    initialConceptId
  );
  const hasInitializedConceptId = useRef(false);

  // Set initial concept ID when dayDetails becomes available
  useEffect(() => {
    if (dayDetails && !selectedConceptId && !hasInitializedConceptId.current) {
      const conceptId = getInitialConceptId();
      if (conceptId) {
        // Use setTimeout to defer state update and avoid synchronous setState
        const timeoutId = setTimeout(() => {
          setSelectedConceptId(conceptId);
          hasInitializedConceptId.current = true;
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [dayDetails, getInitialConceptId, selectedConceptId]);

  const { conceptDetails, loading: conceptDetailsLoading } = useConceptDetails(
    projectId,
    selectedConceptId
  );

  // Sync selectedConceptId when dayDetails/current change (only if not set by user)
  const prevDayDetailsConceptsLength = useRef(dayDetails?.concepts.length ?? 0);
  useEffect(() => {
    if (
      dayDetails &&
      dayDetails.concepts.length > 0 &&
      dayDetails.concepts.length !== prevDayDetailsConceptsLength.current
    ) {
      const newConceptId = getInitialConceptId();
      if (newConceptId && !selectedConceptId) {
        // Use setTimeout to defer state update and avoid synchronous setState
        const timeoutId = setTimeout(() => {
          setSelectedConceptId(newConceptId);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
    prevDayDetailsConceptsLength.current = dayDetails?.concepts.length ?? 0;
  }, [dayDetails, getInitialConceptId, selectedConceptId]);

  // Update selectedConceptId when current concept changes
  useEffect(() => {
    if (current?.current_concept && dayDetails) {
      const currentConceptId = current.current_concept.concept_id;
      // Only update if the current concept is in the selected day
      const conceptInDay = dayDetails.concepts.find(
        (c) => c.concept_id === currentConceptId
      );
      if (conceptInDay && selectedConceptId !== currentConceptId) {
        // Use setTimeout to defer state update and avoid synchronous setState
        const timeoutId = setTimeout(() => {
          setSelectedConceptId(currentConceptId);
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [current?.current_concept, dayDetails, selectedConceptId]);

  const handleConceptClick = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    const conceptProgress = progress?.concept_progress[conceptId];
    if (!conceptProgress || conceptProgress.progress_status === "todo") {
      startConceptProgress(conceptId).catch(console.error);
    }
  };

  const handleStartConcept = async (conceptId: string) => {
    await startConceptProgress(conceptId);
  };

  const handleCompleteConcept = async (conceptId: string) => {
    await completeConceptProgress(conceptId);
    // Dispatch event for other components to know concept was completed
    window.dispatchEvent(
      new CustomEvent("progress:concept:completed", { detail: { conceptId } })
    );
    // Refetch progress to get latest state
    await refetchProgress();
    if (dayDetails) {
      const currentIndex = dayDetails.concepts.findIndex(
        (c) => c.concept_id === conceptId
      );
      if (currentIndex < dayDetails.concepts.length - 1) {
        setSelectedConceptId(dayDetails.concepts[currentIndex + 1].concept_id);
      }
    }
  };

  // Build progress maps
  const dayProgressMap = progress?.day_progress || {};
  const conceptProgressMap = progress?.concept_progress || {};
  const taskProgressMap = progress?.task_progress || {};

  if (roadmapLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading roadmap...</p>
        </div>
      </div>
    );
  }

  if (roadmapError) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
        <p className="text-red-300">{roadmapError}</p>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">No roadmap available yet.</p>
        {generationStatus?.is_generating && (
          <p className="text-blue-400 text-sm">Roadmap is being generated...</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day Header + Days Drawer */}
      <div className="flex-shrink-0">
        <RoadmapDayHeader
          days={days}
          selectedDayId={selectedDayId}
          onSelectDay={setSelectedDayId}
          progressMap={dayProgressMap}
        />
      </div>

      {/* Kanban Board */}
      <div className="flex-1 min-h-0 h-full">
        {dayDetails && (
          <>
            {/* Debug: Log concepts being passed to KanbanBoard */}
            {process.env.NODE_ENV === "development" &&
              (() => {
                console.log("📊 Concepts for KanbanBoard:", {
                  dayId: selectedDayId,
                  dayNumber: dayDetails.day.day_number,
                  totalConcepts: dayDetails.concepts.length,
                  concepts: dayDetails.concepts.map((c) => ({
                    id: c.concept_id,
                    title: c.title,
                    generated_status: c.generated_status,
                    has_content: !!c.content,
                    content_length: c.content?.length || 0,
                    order_index: c.order_index,
                  })),
                  selectedConceptId: selectedConceptId,
                  conceptProgressMapKeys: Object.keys(conceptProgressMap),
                  conceptDetailsConceptId: conceptDetails?.concept?.concept_id,
                  conceptDetailsHasContent: !!conceptDetails?.concept?.content,
                  conceptDetailsContentLength:
                    conceptDetails?.concept?.content?.length || 0,
                });
                return null;
              })()}
            <KanbanBoard
              concepts={dayDetails.concepts}
              currentConceptId={selectedConceptId}
              conceptProgressMap={conceptProgressMap}
              projectId={projectId}
              taskProgress={taskProgressMap}
              onConceptClick={handleConceptClick}
              onStartConcept={handleStartConcept}
              onCompleteConcept={handleCompleteConcept}
              conceptDetails={conceptDetails}
              loadingDetails={conceptDetailsLoading}
              onProgressChange={refetchProgress}
            />
          </>
        )}
      </div>
    </div>
  );
}
