"use client";

import { useState, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from "@dnd-kit/core";
import { type Concept, type ConceptDetails } from "../../lib/api-roadmap";
import ConceptCard from "./ConceptCard";
import ConceptDetailPanel from "./ConceptDetailPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ClipboardList,
  Settings,
  CheckCircle2,
  Circle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface KanbanBoardProps {
  concepts: Concept[];
  currentConceptId: string | null;
  conceptProgressMap: Record<
    string,
    { progress_status: string; content_read?: boolean }
  >;
  projectId: string;
  taskProgress: Record<string, { progress_status: string }>;
  onConceptClick: (conceptId: string) => void;
  onStartConcept: (conceptId: string) => Promise<void>;
  onCompleteConcept: (conceptId: string) => Promise<void>;
  conceptDetails: ConceptDetails | null;
  loadingDetails: boolean;
  onProgressChange: () => Promise<void>;
}

interface DroppableColumnProps {
  id: string;
  title: string;
  count: number;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}

function DroppableColumn({
  id,
  title,
  count,
  color,
  children,
}: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col h-full rounded-xl border transition-colors shadow-sm min-w-[280px] md:min-w-0 ${
        isOver
          ? "bg-zinc-900/80 border-blue-500/50"
          : "bg-[#0c0c0e] border-zinc-800/50"
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-widest">
            {title}
          </h3>
        </div>
        <Badge
          variant="outline"
          className="bg-zinc-900 border-zinc-800 text-zinc-500 text-[10px] font-bold px-1.5 h-5"
        >
          {count}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="p-3 space-y-3 min-h-full">{children}</div>
      </div>
    </div>
  );
}

export default function KanbanBoard({
  concepts,
  currentConceptId,
  conceptProgressMap,
  projectId,
  taskProgress,
  onConceptClick,
  onStartConcept,
  onCompleteConcept,
  conceptDetails,
  loadingDetails,
  onProgressChange,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, string>
  >({});
  const activeConcept = concepts.find((c) => c.concept_id === activeId);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const getConceptStatus = (concept: Concept): string => {
    // Check optimistic updates first
    if (optimisticUpdates[concept.concept_id]) {
      return optimisticUpdates[concept.concept_id];
    }
    const progress = conceptProgressMap[concept.concept_id];
    // Default to "todo" if no progress entry exists
    // This ensures all concepts are displayed, even if they haven't been started yet
    return progress?.progress_status || "todo";
  };

  // Debug: Log if concepts are being filtered incorrectly
  if (process.env.NODE_ENV === "development" && concepts.length > 0) {
    const conceptsWithoutProgress = concepts.filter(
      (c) => !conceptProgressMap[c.concept_id]
    );
    if (conceptsWithoutProgress.length > 0) {
      console.log(
        "📋 Concepts without progress entries (will default to 'todo'):",
        conceptsWithoutProgress.map((c) => ({
          id: c.concept_id,
          title: c.title,
          generated_status: c.generated_status,
          has_content: !!c.content,
        }))
      );
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const conceptId = String(active.id);
    const activeConcept = concepts.find((c) => c.concept_id === conceptId);
    if (!activeConcept) return;

    const currentStatus = getConceptStatus(activeConcept);
    const targetStatus = String(over.id);

    if (currentStatus === targetStatus) return;

    // Optimistic Update
    setOptimisticUpdates((prev) => ({ ...prev, [conceptId]: targetStatus }));

    try {
      // Logic: Todo -> Doing
      if (currentStatus === "todo" && targetStatus === "doing") {
        // Check if previous concept is done
        const currentIndex = concepts.findIndex(
          (c) => c.concept_id === conceptId
        );
        if (currentIndex > 0) {
          const prevConcept = concepts[currentIndex - 1];
          if (getConceptStatus(prevConcept) !== "done") {
            // You can't start this yet!
            setOptimisticUpdates((prev) => {
              const next = { ...prev };
              delete next[conceptId];
              return next;
            });
            return;
          }
        }
        await onStartConcept(conceptId);
      }
      // Logic: Doing -> Done
      else if (currentStatus === "doing" && targetStatus === "done") {
        await onCompleteConcept(conceptId);
      }
    } catch (err) {
      console.error("Drag and drop error:", err);
      // Rollback optimistic update on error
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[conceptId];
        return next;
      });
    } finally {
      // Clear optimistic update after a delay to allow the server state to propagate
      setTimeout(() => {
        setOptimisticUpdates((prev) => {
          const next = { ...prev };
          delete next[conceptId];
          return next;
        });
      }, 1000);
    }
  };

  // Filter concepts by progress status
  // Note: Concepts without progress entries default to "todo" status
  // This ensures all concepts are displayed, even if they haven't been started yet
  const todoConcepts = concepts.filter((c) => getConceptStatus(c) === "todo");
  const doingConcepts = concepts.filter((c) => getConceptStatus(c) === "doing");
  const doneConcepts = concepts.filter((c) => getConceptStatus(c) === "done");

  // Debug: Log concept counts to help diagnose rendering issues
  if (
    concepts.length > 0 &&
    todoConcepts.length === 0 &&
    doingConcepts.length === 0 &&
    doneConcepts.length === 0
  ) {
    console.warn("⚠️ All concepts filtered out:", {
      total: concepts.length,
      concepts: concepts.map((c) => ({
        id: c.concept_id,
        title: c.title,
        generated_status: c.generated_status,
        progress_status: getConceptStatus(c),
      })),
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="relative h-full w-full group/kanban">
        {/* Scroll Buttons - Visible only on mobile or when overflowed */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/kanban:opacity-100 transition-opacity hidden md:flex">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-zinc-900/80 border-zinc-800 text-white hover:bg-zinc-800 -ml-4 shadow-xl"
            onClick={() => scroll("left")}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </div>

        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover/kanban:opacity-100 transition-opacity hidden md:flex">
          <Button
            variant="secondary"
            size="icon"
            className="rounded-full bg-zinc-900/80 border-zinc-800 text-white hover:bg-zinc-800 -mr-4 shadow-xl"
            onClick={() => scroll("right")}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Mobile Navigation Arrows (Always visible on mobile) */}
        <div className="flex md:hidden items-center justify-between px-4 py-2 bg-zinc-900/30 border-b border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll("left")}
            className="text-zinc-500 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Prev
          </Button>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
            Swipe or use arrows
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => scroll("right")}
            className="text-zinc-500 hover:text-white"
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex md:grid md:grid-cols-3 gap-4 h-full p-4 bg-[#09090b] min-h-0 overflow-x-auto md:overflow-x-hidden no-scrollbar snap-x snap-mandatory"
        >
          {/* To Do Column */}
          <div className="flex-shrink-0 w-[85vw] md:w-auto snap-center">
            <DroppableColumn
              id="todo"
              title="To Do"
              count={todoConcepts.length}
              icon={ClipboardList}
              color="bg-zinc-500"
            >
              {todoConcepts.map((concept) => {
                const globalIndex = concepts.findIndex(
                  (c) => c.concept_id === concept.concept_id
                );
                const isLocked =
                  globalIndex > 0 &&
                  getConceptStatus(concepts[globalIndex - 1]) !== "done";

                return (
                  <ConceptCard
                    key={concept.concept_id}
                    concept={concept}
                    onClick={() => onConceptClick(concept.concept_id)}
                    disabled={isLocked}
                  />
                );
              })}
              {todoConcepts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 opacity-50">
                  <Circle className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-medium uppercase tracking-tighter">
                    Queue Empty
                  </p>
                </div>
              )}
            </DroppableColumn>
          </div>

          {/* Doing Column */}
          <div className="flex-shrink-0 w-[85vw] md:w-auto snap-center">
            <DroppableColumn
              id="doing"
              title="In Progress"
              count={doingConcepts.length}
              icon={Settings}
              color="bg-blue-500"
            >
              {doingConcepts.map((concept) => (
                <div key={concept.concept_id} className="animate-fade-in-up">
                  {currentConceptId === concept.concept_id ? (
                    <ConceptDetailPanel
                      conceptDetails={conceptDetails}
                      loading={loadingDetails}
                      projectId={projectId}
                      conceptProgress={conceptProgressMap}
                      taskProgress={taskProgress}
                      onStart={() => onStartConcept(concept.concept_id)}
                      onComplete={() => onCompleteConcept(concept.concept_id)}
                      onProgressChange={onProgressChange}
                      isLastConcept={
                        concepts[concepts.length - 1]?.concept_id ===
                        concept.concept_id
                      }
                    />
                  ) : (
                    <ConceptCard
                      concept={concept}
                      onClick={() => onConceptClick(concept.concept_id)}
                    />
                  )}
                </div>
              ))}
              {doingConcepts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 opacity-50">
                  <Settings className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-medium uppercase tracking-tighter">
                    Nothing active
                  </p>
                </div>
              )}
            </DroppableColumn>
          </div>

          {/* Done Column */}
          <div className="flex-shrink-0 w-[85vw] md:w-auto snap-center">
            <DroppableColumn
              id="done"
              title="Completed"
              count={doneConcepts.length}
              icon={CheckCircle2}
              color="bg-emerald-500"
            >
              {doneConcepts.map((concept) => (
                <ConceptCard
                  key={concept.concept_id}
                  concept={concept}
                  onClick={() => onConceptClick(concept.concept_id)}
                  completed
                />
              ))}
              {doneConcepts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-600 opacity-50">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-medium uppercase tracking-tighter">
                    No completions yet
                  </p>
                </div>
              )}
            </DroppableColumn>
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && activeConcept ? (
          <div className="w-[300px] pointer-events-none rotate-3 opacity-90">
            <ConceptCard concept={activeConcept} onClick={() => {}} disabled />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
