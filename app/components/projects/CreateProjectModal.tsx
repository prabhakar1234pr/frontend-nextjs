'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { createProjectClient, type CreateProjectData } from '../../lib/api-client'

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: () => void
}

type ExperienceLevel = 'beginner' | 'intermediate' | 'expert'

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const router = useRouter()
  const { getToken } = useAuth()
  const [githubUrl, setGithubUrl] = useState('')
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate')
  const [duration, setDuration] = useState(14)
  const [isLoading, setIsLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

  // Validate GitHub URL
  const validateGitHubUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('GitHub URL is required')
      return false
    }
    
    const githubRegex = /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/
    if (!githubRegex.test(url)) {
      setUrlError('Please enter a valid GitHub repository URL')
      return false
    }
    
    setUrlError('')
    return true
  }

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value
    setGithubUrl(url)
    if (url && urlError) {
      validateGitHubUrl(url)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateGitHubUrl(githubUrl)) {
      return
    }

    setIsLoading(true)

    try {
      // Get token from Clerk
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required. Please sign in.')
      }

      // Call API to create project
      const projectData: CreateProjectData = {
        github_url: githubUrl,
        skill_level: experience,
        target_days: duration
      }
      
      const response = await createProjectClient(projectData, token)
      
      if (response.success && response.project) {
        // Close modal first
        onClose()
        
        // Trigger project refresh callback immediately
        // The callback will fetch fresh data from the server
        if (onProjectCreated) {
          onProjectCreated()
        }
      } else {
        throw new Error('Failed to create project')
      }
    } catch (error) {
      console.error('Failed to create project:', error)
      // Show error message to user
      setUrlError(error instanceof Error ? error.message : 'Failed to create project. Please try again.')
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-[#2f3338] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#2f3338] border-b border-zinc-700 px-8 py-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-white mb-1">
              Create a GitGuide
            </h2>
            <p className="text-sm text-zinc-400">
              Learn by building
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-700 rounded-lg"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6">
          {/* GitHub Repository Field */}
          <div>
            <label htmlFor="github-url" className="block text-sm font-medium text-zinc-200 mb-2">
              GitHub Repository
            </label>
            <p className="text-xs text-zinc-400 mb-3">
              Paste GitHub repository URL of the project from where you want to learn
            </p>
            <input
              id="github-url"
              type="text"
              value={githubUrl}
              onChange={handleUrlChange}
              onBlur={() => validateGitHubUrl(githubUrl)}
              placeholder="https://github.com/vercel/next.js"
              className={`w-full px-4 py-3 bg-[#3f4449] border rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all ${
                urlError ? 'border-red-500' : 'border-zinc-600'
              }`}
            />
            {urlError && (
              <p className="mt-2 text-sm text-red-400">{urlError}</p>
            )}
            {githubUrl && !urlError && (
              <p className="mt-2 text-sm text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Valid GitHub URL
              </p>
            )}
          </div>

          {/* Your Experience Field */}
          <div>
            <label htmlFor="experience" className="block text-sm font-medium text-zinc-200 mb-2">
              Your Experience
            </label>
            <p className="text-xs text-zinc-400 mb-3">
              How would you rate yourself in the tech stack of the given project?
            </p>
            <select
              id="experience"
              value={experience}
              onChange={(e) => setExperience(e.target.value as ExperienceLevel)}
              className="w-full px-4 py-3 bg-[#3f4449] border border-zinc-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all cursor-pointer"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {/* Target Duration Field */}
          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-zinc-200 mb-2">
              Target Duration
            </label>
            <p className="text-xs text-zinc-400 mb-3">
              In how many days do you want to build this project?
            </p>
            
            {/* Slider */}
            <div className="space-y-3">
              <input
                id="duration"
                type="range"
                min="7"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-2 bg-[#3f4449] rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #fff 0%, #fff ${((duration - 7) / (30 - 7)) * 100}%, #3f4449 ${((duration - 7) / (30 - 7)) * 100}%, #3f4449 100%)`
                }}
              />
              
              {/* Duration Display */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">7 days</span>
                <div className="text-center">
                  <p className="text-2xl font-semibold text-white transition-all duration-300">
                    {duration}
                  </p>
                  <p className="text-xs text-zinc-400">days</p>
                </div>
                <span className="text-xs text-zinc-400">30 days</span>
              </div>
              
              {/* Helper text */}
              <p className="text-sm text-zinc-400 text-center">
                We'll create a {duration}-day learning plan
              </p>
            </div>
          </div>

          {/* CTA Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading || !githubUrl || !!urlError}
              className="w-full px-6 py-3.5 bg-white text-[#2f3338] rounded-lg font-medium hover:bg-zinc-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Preparing your project...</span>
                </>
              ) : (
                <>
                  <span>Let's start building</span>
                  <span className="group-hover:translate-x-1 transition-transform">⚡</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

