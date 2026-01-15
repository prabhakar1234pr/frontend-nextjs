'use client'

import { useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { createProjectClient, type CreateProjectData } from '../../lib/api-client'
import { Button } from '@/components/ui/button'
import { 
  X, 
  Loader2, 
  Github, 
  Check,
  Rocket
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onProjectCreated?: () => void
}

type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced'

export default function CreateProjectModal({ isOpen, onClose, onProjectCreated }: CreateProjectModalProps) {
  const { getToken } = useAuth()
  const [githubUrl, setGithubUrl] = useState('')
  const [experience, setExperience] = useState<ExperienceLevel>('intermediate')
  const [duration, setDuration] = useState(14)
  const [isLoading, setIsLoading] = useState(false)
  const [urlError, setUrlError] = useState('')

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
    if (url && urlError) validateGitHubUrl(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateGitHubUrl(githubUrl)) return
    setIsLoading(true)
    try {
      const token = await getToken()
      if (!token) throw new Error('Authentication required')
      const projectData: CreateProjectData = {
        github_url: githubUrl,
        skill_level: experience,
        target_days: duration
      }
      const response = await createProjectClient(projectData, token)
      if (response.success && response.project) {
        onClose()
        if (onProjectCreated) onProjectCreated()
      } else {
        throw new Error('Failed to create project')
      }
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : 'Failed to create project')
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-[#1e1e1e] border-zinc-800 text-zinc-200 max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="px-8 py-6 border-b border-zinc-800 bg-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-white">Create a GitGuide</DialogTitle>
              <p className="text-xs text-zinc-500 font-medium">Build real projects from GitHub</p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-8 py-8 space-y-8 bg-[#18181b]">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
              GitHub Repository
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Github className="h-4 w-4 text-zinc-600" />
              </div>
              <input
                type="text"
                value={githubUrl}
                onChange={handleUrlChange}
                placeholder="https://github.com/vercel/next.js"
                className={`w-full pl-11 pr-4 py-3.5 bg-zinc-900/50 border rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 transition-all ${
                  urlError ? 'border-red-500/50' : 'border-zinc-800 focus:border-blue-600/50'
                }`}
              />
            </div>
            {urlError && <p className="mt-2 text-xs text-red-400 font-medium">{urlError}</p>}
            {githubUrl && !urlError && (
              <p className="mt-2 text-[11px] text-emerald-500 font-bold flex items-center gap-1.5 uppercase tracking-tighter">
                <Check className="w-3.5 h-3.5" /> Valid repository found
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                Experience
              </label>
              <select
                value={experience}
                onChange={(e) => setExperience(e.target.value as ExperienceLevel)}
                className="w-full px-4 py-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 cursor-pointer appearance-none"
              >
                <option value="beginner">Beginner (New to stack)</option>
                <option value="intermediate">Intermediate (Some context)</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4">
                Duration: <span className="text-white">{duration} Days</span>
              </label>
              <input
                type="range"
                min="7"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-zinc-600 uppercase tracking-tighter">
                <span>Quick (7d)</span>
                <span>Deep Dive (30d)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800/50">
            <Button
              type="submit"
              disabled={isLoading || !githubUrl || !!urlError}
              className="w-full py-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-900/20 transition-all group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Analyzing Repository...
                </>
              ) : (
                <>
                  Generate Learning Roadmap
                  <Rocket className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
