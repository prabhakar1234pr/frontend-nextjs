'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CreateProjectModal from '../projects/CreateProjectModal'
import { type Project } from '../../lib/api'

interface DashboardContentProps {
  projects: Project[]
}

export default function DashboardContent({ projects: initialProjects }: DashboardContentProps) {
  const router = useRouter()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>(initialProjects)

  // Refresh projects when modal closes (in case a new project was created)
  const handleModalClose = () => {
    setIsModalOpen(false)
    // Refresh the page to get latest projects
    router.refresh()
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

  return (
    <>
      <div className="min-h-screen bg-[#2f3338]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between mb-10">
            {/* Left: Tabs and View Controls */}
            <div className="flex items-center gap-6">
              {/* Tab Navigation */}
              <div className="flex items-center gap-2 bg-[#3f4449] rounded-full p-1">
                <button className="px-5 py-2 text-[13px] font-medium text-white bg-[#5f6368] rounded-full transition-all duration-200">
                  All
                </button>
                <button className="px-5 py-2 text-[13px] font-medium text-zinc-300 hover:text-white rounded-full transition-all duration-200">
                  My gitguides
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-[#3f4449] rounded-lg p-1">
                <button className="p-2 text-zinc-300 hover:text-white transition-all duration-200" title="Grid view">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button className="p-2 text-zinc-300 hover:text-white transition-all duration-200" title="List view">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right: Sort and Create */}
            <div className="flex items-center gap-3">
              <select className="px-4 py-2 text-[13px] font-medium text-zinc-300 bg-[#3f4449] border-none rounded-lg hover:bg-[#4f5459] transition-all duration-200 cursor-pointer">
                <option>Most recent</option>
                <option>Name (A-Z)</option>
                <option>Name (Z-A)</option>
                <option>Oldest first</option>
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
                    {projects.length === 0 ? 'Create your first GitGuide' : 'Create new GitGuide'}
                  </p>
                </div>
              </button>

              {/* Project Cards */}
              {projects.map((project) => (
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
                  <button 
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Add project options menu
                    }}
                    className="absolute top-4 right-4 w-8 h-8 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                    </svg>
                  </button>
                </div>
              ))}

              {/* Empty placeholder cards if less than 4 total items (including create card) */}
              {projects.length < 3 && Array.from({ length: 3 - projects.length }).map((_, i) => (
                <div key={`placeholder-${i}`} className="aspect-[4/3] bg-[#3f4449] rounded-xl opacity-30" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
      />
    </>
  )
}

