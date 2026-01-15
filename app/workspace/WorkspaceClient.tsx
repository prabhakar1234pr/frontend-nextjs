'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { useEffect, useState } from 'react'
import {
  getTaskDetails,
  getProgress,
  getDayDetails,
  getConceptDetails,
  getRoadmap,
  type TaskDetails,
  type DayDetails,
  type ConceptDetails,
} from '../lib/api-roadmap'
import WorkplaceIDE from '../components/workspace/WorkplaceIDE'

// Type for next navigation target
interface NextNavigation {
  type: 'task' | 'concept' | 'day' | 'complete'
  taskId?: string
  conceptId?: string
  dayNumber?: number
  projectId: string
}

export default function WorkspaceClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { getToken } = useAuth()
  const taskId = searchParams.get('task')

  const [taskDetails, setTaskDetails] = useState<TaskDetails | null>(null)
  const [dayDetails, setDayDetails] = useState<DayDetails | null>(null)
  const [conceptDetails, setConceptDetails] = useState<ConceptDetails | null>(null)
  const [nextDayFirstConcept, setNextDayFirstConcept] = useState<string | null>(null)
  const [isTaskCompleted, setIsTaskCompleted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Reset state when taskId changes
    setIsTaskCompleted(false)
    setLoading(true)
    setError(null)
    setNextDayFirstConcept(null)

    async function fetchTaskDetails() {
      if (!taskId) {
        setError('Task ID is required')
        setLoading(false)
        return
      }

      try {
        const token = await getToken()
        if (!token) {
          setError('Authentication required')
          setLoading(false)
          return
        }

        const data = await getTaskDetails(taskId, token)
        setTaskDetails(data)

        // Fetch day, concept, and roadmap details
        if (data.project.project_id && data.day.day_id && data.concept.concept_id) {
          const [progress, dayData, conceptData, roadmapData] = await Promise.all([
            getProgress(data.project.project_id, token),
            getDayDetails(data.project.project_id, data.day.day_id, token),
            getConceptDetails(data.project.project_id, data.concept.concept_id, token),
            getRoadmap(data.project.project_id, token),
          ])

          setDayDetails(dayData)
          setConceptDetails(conceptData)

          // Find next day and its first concept
          const currentDayNumber = data.day.day_number
          const sortedDays = (roadmapData.days || []).sort((a, b) => a.day_number - b.day_number)
          const nextDay = sortedDays.find(
            d => d.day_number === currentDayNumber + 1 && d.generated_status === 'generated'
          )

          if (nextDay) {
            // Fetch next day's details to get first concept
            try {
              const nextDayData = await getDayDetails(data.project.project_id, nextDay.day_id, token)
              if (nextDayData.concepts && nextDayData.concepts.length > 0) {
                const firstConcept = nextDayData.concepts.sort((a, b) => a.order_index - b.order_index)[0]
                setNextDayFirstConcept(firstConcept.concept_id)
              }
            } catch (e) {
              console.error('Failed to fetch next day details:', e)
            }
          }

          const taskProgress = progress.task_progress[taskId]
          // Only set to true if explicitly done, otherwise stays false
          setIsTaskCompleted(taskProgress?.progress_status === 'done')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load task details')
      } finally {
        setLoading(false)
      }
    }

    fetchTaskDetails()
  }, [taskId, getToken])

  if (loading) {
    return (
      <div className="h-screen overflow-hidden bg-[#1e1e1e]">
        <div className="flex items-center justify-center h-screen">
          <div className="text-white">Loading task...</div>
        </div>
      </div>
    )
  }

  if (error || !taskDetails) {
    return (
      <div className="h-screen overflow-hidden bg-[#1e1e1e]">
        <div className="flex items-center justify-center h-screen">
          <div className="text-red-400">{error || 'Task not found'}</div>
        </div>
      </div>
    )
  }

  // Calculate what comes next after this task
  const nextNavigation: NextNavigation | null = (() => {
    if (!conceptDetails || !taskDetails || !taskId || !dayDetails) return null

    const projectId = taskDetails.project.project_id
    const currentTaskIndex = conceptDetails.tasks.findIndex(t => t.task_id === taskId)

    // Check if there's another task in the current concept
    if (currentTaskIndex >= 0 && currentTaskIndex < conceptDetails.tasks.length - 1) {
      return {
        type: 'task',
        taskId: conceptDetails.tasks[currentTaskIndex + 1].task_id,
        projectId,
      }
    }

    // Last task of concept - check if there's another concept in this day
    const sortedConcepts = [...dayDetails.concepts].sort((a, b) => a.order_index - b.order_index)
    const currentConceptIndex = sortedConcepts.findIndex(c => c.concept_id === taskDetails.concept.concept_id)

    if (currentConceptIndex >= 0 && currentConceptIndex < sortedConcepts.length - 1) {
      // Navigate to next concept's docs page
      return {
        type: 'concept',
        conceptId: sortedConcepts[currentConceptIndex + 1].concept_id,
        projectId,
      }
    }

    // Last task of last concept - check if there's a next day
    if (nextDayFirstConcept) {
      return {
        type: 'day',
        conceptId: nextDayFirstConcept,
        dayNumber: taskDetails.day.day_number + 1,
        projectId,
      }
    }

    // No more content - roadmap complete
    return {
      type: 'complete',
      projectId,
    }
  })()

  // For backward compatibility - extract nextTaskId
  const nextTaskId = nextNavigation?.type === 'task' ? nextNavigation.taskId : null

  const handleProgressChange = async () => {
    // Refresh progress when task is completed (to unlock next day if needed)
    if (taskDetails) {
      try {
        const token = await getToken()
        if (!token) return

        // Refresh progress to unlock next day
        await getProgress(taskDetails.project.project_id, token)
      } catch (error) {
        console.error('Failed to refresh progress:', error)
      }
    }
  }

  return (
    <div className="h-screen overflow-hidden bg-[#1e1e1e]">
      <WorkplaceIDE
        taskDetails={taskDetails}
        initialCompleted={isTaskCompleted}
        onProgressChange={handleProgressChange}
        nextTaskId={nextTaskId}
        nextNavigation={nextNavigation}
      />
    </div>
  )
}


