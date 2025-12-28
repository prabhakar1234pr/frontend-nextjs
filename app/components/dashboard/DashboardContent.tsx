'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { type Project } from '../../lib/api'
import { deleteProject, listUserProjectsClient } from '../../lib/api-client'

// Dynamically import CreateProjectModal to reduce initial bundle size
const CreateProjectModal = dynamic(
  () => import('../projects/CreateProjectModal'),
  { 
    ssr: false, // Modal only needed on client side
    loading: () => null // No loading state needed for modal
  }
)

interface DashboardContentProps {
  projects: Project[]
}

type ViewType = 'grid' | 'list'
type SortOption = 'most-recent' | 'name-asc' | 'name-desc' | 'oldest-first'

export default function DashboardContent({ projects: initialProjects }: DashboardContentProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [sortOption, setSortOption] = useState<SortOption>('most-recent')
  const menuRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Refresh projects from API (client-side)
  const refreshProjects = async () => {
    try {
      const token = await getToken()
      if (token) {
        const response = await listUserProjectsClient(token)
        if (response.success && response.projects) {
          setProjects(response.projects)
        }
      }
    } catch (error) {
      console.error('Failed to refresh projects:', error)
    }
  }

  // Refresh projects when modal closes (in case a new project was created)
  const handleModalClose = () => {
    setIsModalOpen(false)
    // Refresh projects client-side without full page reload
    refreshProjects()
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  // Filter projects: only show "ready" projects, track "processing" separately
  const readyProjects = projects.filter(p => p.status === 'ready')
  const processingProjects = projects.filter(p => p.status === 'processing' || p.status === 'created')
  
  // Sort ready projects based on selected option
  const sortedProjects = [...readyProjects].sort((a, b) => {
    switch (sortOption) {
      case 'most-recent':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      case 'oldest-first':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case 'name-asc':
        return a.project_name.localeCompare(b.project_name)
      case 'name-desc':
        return b.project_name.localeCompare(a.project_name)
      default:
        return 0
    }
  })

  // Auto-refresh when there are processing projects
  useEffect(() => {
    if (processingProjects.length > 0) {
      // Poll every 5 seconds to check if projects are ready
      refreshIntervalRef.current = setInterval(async () => {
        try {
          const token = await getToken()
          if (token) {
            const response = await listUserProjectsClient(token)
            if (response.success && response.projects) {
              setProjects(response.projects)
            }
          }
        } catch (error) {
          console.error('Failed to refresh projects:', error)
        }
      }, 5000)
    } else {
      // Clear interval when no processing projects
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }

    // Cleanup on unmount
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [processingProjects.length, getToken])

  // Handle menu toggle
  const handleMenuToggle = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setOpenMenuId(openMenuId === projectId ? null : projectId)
  }

  // Handle delete confirmation
  const handleDeleteClick = (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation()
    setOpenMenuId(null)
    setDeleteConfirmId(projectId)
  }

  // Handle delete confirmation cancel
  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    
    setIsDeleting(true)
    try {
      const token = await getToken()
      await deleteProject(deleteConfirmId, token)
      
      // Optimistic update - remove from local state
      setProjects(projects.filter(p => p.project_id !== deleteConfirmId))
      setDeleteConfirmId(null)
      
      // Refresh to sync with server
      router.refresh()
    } catch (error) {
      console.error('Failed to delete project:', error)
      alert('Failed to delete project. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        const menuElement = menuRefs.current[openMenuId]
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  return (
    <>
      <div className="min-h-screen bg-[#2f3338]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between mb-10">
            {/* Left: View Controls */}
            <div className="flex items-center gap-6">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#3f4449] rounded-lg p-1">
                <button 
                  onClick={() => setViewType('grid')}
                  className={`p-2 transition-all duration-200 ${
                    viewType === 'grid' 
                      ? 'text-white bg-[#5f6368]' 
                      : 'text-zinc-300 hover:text-white'
                  }`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button 
                  onClick={() => setViewType('list')}
                  className={`p-2 transition-all duration-200 ${
                    viewType === 'list' 
                      ? 'text-white bg-[#5f6368]' 
                      : 'text-zinc-300 hover:text-white'
                  }`}
                  title="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: Sort and Create */}
            <div className="flex items-center gap-3">
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-4 py-2 text-[13px] font-medium text-zinc-300 bg-[#3f4449] border-none rounded-lg hover:bg-[#4f5459] transition-all duration-200 cursor-pointer"
              >
                <option value="most-recent">Most recent</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="oldest-first">Oldest first</option>
              </select>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-5 py-2.5 text-[13px] font-medium text-[#2f3338] bg-white rounded-full hover:bg-zinc-100 transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create new
              </button>
            </div>
          </div>

          {/* GitGuides Section */}
          <div className="mb-12">
            <h2 className="text-[20px] font-medium text-zinc-200 mb-6">
              Your GitGuides
            </h2>

            {/* Processing Projects Loading Message */}
            {processingProjects.length > 0 && (
              <div className="mb-6 bg-[#3f4449] border border-zinc-600 rounded-lg p-6">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium mb-1">
                      Hang in there for a moment, your GitGuide{processingProjects.length > 1 ? 's are' : ' is'} being generated
                    </p>
                    <p className="text-zinc-400 text-sm">
                      {processingProjects.length} project{processingProjects.length > 1 ? 's' : ''} currently processing...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {viewType === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Create New Card - Always show first */}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="aspect-[4/3] border-2 border-dashed border-zinc-600 rounded-xl hover:border-zinc-500 hover:bg-[#3f4449] transition-all duration-200 flex items-center justify-center group"
                >
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-[#4f5459] rounded-full flex items-center justify-center group-hover:bg-[#5f6368] transition-all duration-200">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-zinc-400 group-hover:text-zinc-300">
                      {sortedProjects.length === 0 && processingProjects.length === 0 ? 'Create your first GitGuide' : 'Create new GitGuide'}
                    </p>
                  </div>
                </button>

                {/* Project Cards */}
                {sortedProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className="aspect-[4/3] bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 cursor-pointer relative group"
                    onClick={() => router.push(`/project/${project.project_id}`)}
                  >
                    {/* Project Icon/Avatar */}
                    <div className="w-10 h-10 bg-white rounded-full mb-4 flex items-center justify-center text-[14px] font-semibold text-zinc-900">
                      {project.project_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Project Info */}
                    <h3 className="text-[16px] font-medium text-white mb-2 line-clamp-2 group-hover:text-zinc-100 transition-colors">
                      {project.project_name}
                    </h3>
                    <p className="text-[12px] text-zinc-400">
                      {formatDate(project.created_at)} · {project.target_days} days
                    </p>

                    {/* Status Badge */}
                    <div className="absolute bottom-4 left-6">
                      <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-zinc-600/50 text-zinc-300 capitalize">
                        {project.status}
                      </span>
                    </div>

                    {/* Options Menu */}
                    <div className="absolute top-4 right-4" ref={(el) => { menuRefs.current[project.project_id] = el }}>
                      <button 
                        onClick={(e) => handleMenuToggle(e, project.project_id)}
                        className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                      
                      {/* Dropdown Menu */}
                      {openMenuId === project.project_id && (
                        <div className="absolute right-0 top-10 mt-1 w-48 bg-[#3f4449] rounded-lg shadow-lg border border-zinc-600 z-50">
                          <button
                            onClick={(e) => handleDeleteClick(e, project.project_id)}
                            className="w-full px-4 py-2 text-left text-[13px] text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty placeholder cards if less than 4 total items (including create card) */}
                {sortedProjects.length < 3 && Array.from({ length: 3 - sortedProjects.length }).map((_, i) => (
                  <div key={`placeholder-${i}`} className="aspect-[4/3] bg-[#3f4449] rounded-xl opacity-30" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Create New Card - List View */}
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full border-2 border-dashed border-zinc-600 rounded-xl hover:border-zinc-500 hover:bg-[#3f4449] transition-all duration-200 flex items-center justify-center group p-6"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#4f5459] rounded-full flex items-center justify-center group-hover:bg-[#5f6368] transition-all duration-200">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="text-[13px] font-medium text-zinc-400 group-hover:text-zinc-300">
                      {sortedProjects.length === 0 && processingProjects.length === 0 ? 'Create your first GitGuide' : 'Create new GitGuide'}
                    </p>
                  </div>
                </button>

                {/* Project List Items */}
                {sortedProjects.map((project) => (
                  <div
                    key={project.project_id}
                    className="bg-gradient-to-r from-zinc-700 to-zinc-800 rounded-xl p-6 hover:shadow-xl hover:scale-[1.01] transition-all duration-200 cursor-pointer relative group"
                    onClick={() => router.push(`/project/${project.project_id}`)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Project Icon/Avatar */}
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[16px] font-semibold text-zinc-900 flex-shrink-0">
                        {project.project_name.charAt(0).toUpperCase()}
                      </div>

                      {/* Project Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-[16px] font-medium text-white group-hover:text-zinc-100 transition-colors">
                            {project.project_name}
                          </h3>
                          <span className="inline-block px-2 py-1 text-[10px] font-medium rounded-full bg-zinc-600/50 text-zinc-300 capitalize">
                            {project.status}
                          </span>
                        </div>
                        <p className="text-[12px] text-zinc-400">
                          {formatDate(project.created_at)} · {project.target_days} days
                        </p>
                      </div>

                      {/* Options Menu */}
                      <div className="flex-shrink-0 relative" ref={(el) => { menuRefs.current[project.project_id] = el }}>
                        <button 
                          onClick={(e) => handleMenuToggle(e, project.project_id)}
                          className="w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                          </svg>
                        </button>
                        
                        {/* Dropdown Menu */}
                        {openMenuId === project.project_id && (
                          <div className="absolute right-0 top-10 mt-1 w-48 bg-[#3f4449] rounded-lg shadow-lg border border-zinc-600 z-50">
                            <button
                              onClick={(e) => handleDeleteClick(e, project.project_id)}
                              className="w-full px-4 py-2 text-left text-[13px] text-red-400 hover:bg-zinc-700 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        onProjectCreated={refreshProjects}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#3f4449] rounded-lg p-6 max-w-md w-full mx-4 border border-zinc-600">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Project</h3>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete "{projects.find(p => p.project_id === deleteConfirmId)?.project_name}"? 
              This will permanently delete the project, all chunks, and embeddings. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleDeleteCancel}
                disabled={isDeleting}
                className="px-4 py-2 text-[13px] font-medium text-zinc-300 bg-zinc-600 rounded-lg hover:bg-zinc-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 text-[13px] font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

