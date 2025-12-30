'use client'

import { useState, useEffect } from 'react'
import { useRoadmap, useDayDetails, useConceptDetails } from '../../hooks/useRoadmap'
import { useProgress } from '../../hooks/useProgress'
import DayCardsStrip from './DayCardsStrip'
import KanbanBoard from './KanbanBoard'
import ChatbotWidget from '../chatbot/ChatbotWidget'
import { type RoadmapDay, type Concept } from '../../lib/api-roadmap'

interface RoadmapPageProps {
  projectId: string
}

export default function RoadmapPage({ projectId }: RoadmapPageProps) {
  const { days, loading: roadmapLoading, error: roadmapError, generationStatus } = useRoadmap(projectId)
  const { 
    progress, 
    current, 
    loading: progressLoading,
    startConcept: startConceptProgress,
    completeConcept: completeConceptProgress,
    startDay: startDayProgress,
    completeDay: completeDayProgress,
  } = useProgress(projectId)
  
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null)
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null)
  
  const { dayDetails, loading: dayDetailsLoading } = useDayDetails(projectId, selectedDayId)
  const { conceptDetails, loading: conceptDetailsLoading } = useConceptDetails(projectId, selectedConceptId)
  
  // Set initial day when days load
  useEffect(() => {
    if (days.length > 0 && !selectedDayId) {
      // Find first unlocked day or current day
      const currentDay = current?.current_day
      if (currentDay) {
        setSelectedDayId(currentDay.day_id)
      } else {
        // Find first generated day
        const firstGenerated = days.find(d => d.generated_status === 'generated')
        if (firstGenerated) {
          setSelectedDayId(firstGenerated.day_id)
        } else {
          setSelectedDayId(days[0].day_id)
        }
      }
    }
  }, [days, current, selectedDayId])
  
  // Set current concept when day changes
  useEffect(() => {
    if (dayDetails && dayDetails.concepts.length > 0 && !selectedConceptId) {
      const currentConcept = current?.current_concept
      if (currentConcept) {
        setSelectedConceptId(currentConcept.concept_id)
      } else {
        // Find first concept
        setSelectedConceptId(dayDetails.concepts[0].concept_id)
      }
    }
  }, [dayDetails, current, selectedConceptId])
  
  const handleConceptClick = (conceptId: string) => {
    setSelectedConceptId(conceptId)
    // Move concept to doing if it's in todo
    const conceptProgress = progress?.concept_progress[conceptId]
    if (!conceptProgress || conceptProgress.progress_status === 'todo') {
      startConceptProgress(conceptId).catch(console.error)
    }
  }
  
  const handleStartConcept = async (conceptId: string) => {
    await startConceptProgress(conceptId)
  }
  
  const handleCompleteConcept = async (conceptId: string) => {
    await completeConceptProgress(conceptId)
    // Move to next concept
    if (dayDetails) {
      const currentIndex = dayDetails.concepts.findIndex(c => c.concept_id === conceptId)
      if (currentIndex < dayDetails.concepts.length - 1) {
        setSelectedConceptId(dayDetails.concepts[currentIndex + 1].concept_id)
      }
    }
  }
  
  // Build progress maps
  const dayProgressMap = progress?.day_progress || {}
  const conceptProgressMap = progress?.concept_progress || {}
  
  // Get roadmap context for chatbot
  const roadmapContext = {
    day_number: dayDetails?.day.day_number ?? null,
    day_theme: dayDetails?.day.theme ?? null,
    concept_title: conceptDetails?.concept.title ?? null,
    subconcept_title: null, // TODO: Track current subconcept
  }
  
  if (roadmapLoading || progressLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading roadmap...</p>
        </div>
      </div>
    )
  }
  
  if (roadmapError) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
        <p className="text-red-300">{roadmapError}</p>
      </div>
    )
  }
  
  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400 mb-4">No roadmap available yet.</p>
        {generationStatus?.is_generating && (
          <p className="text-blue-400 text-sm">Roadmap is being generated...</p>
        )}
      </div>
    )
  }
  
  return (
    <>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Day Cards Strip */}
        <div className="flex-shrink-0">
          <DayCardsStrip
            days={days}
            currentDayId={selectedDayId}
            onDayClick={setSelectedDayId}
            progressMap={dayProgressMap}
          />
        </div>
        
        {/* Kanban Board */}
        <div className="flex-1 min-h-0">
          {dayDetails && (
            <KanbanBoard
              concepts={dayDetails.concepts}
              currentConceptId={selectedConceptId}
              conceptProgressMap={conceptProgressMap}
              onConceptClick={handleConceptClick}
              onStartConcept={handleStartConcept}
              onCompleteConcept={handleCompleteConcept}
              conceptDetails={conceptDetails}
              loadingDetails={conceptDetailsLoading}
            />
          )}
        </div>
      </div>
      
      {/* Floating Chatbot Widget */}
      <ChatbotWidget 
        projectId={projectId}
        roadmapContext={roadmapContext}
      />
    </>
  )
}

