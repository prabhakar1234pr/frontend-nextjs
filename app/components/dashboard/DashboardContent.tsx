'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { type Project } from '../../lib/api'
import { deleteProject, listUserProjectsClient } from '../../lib/api-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Plus, 
  LayoutGrid, 
  List as ListIcon, 
  MoreVertical, 
  Trash2, 
  Loader2, 
  AlertCircle,
  Clock,
  Calendar
} from 'lucide-react'

const CreateProjectModal = dynamic(
  () => import('../projects/CreateProjectModal'),
  { 
    ssr: false,
    loading: () => null
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [viewType, setViewType] = useState<ViewType>('grid')
  const [sortOption, setSortOption] = useState<SortOption>('most-recent')
  const [mounted, setMounted] = useState(false)
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  const handleModalClose = () => {
    setIsModalOpen(false)
    refreshProjects()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  const readyProjects = projects.filter(p => p.status === 'ready')
  const processingProjects = projects.filter(p => p.status === 'processing' || p.status === 'created')
  const failedProjects = projects.filter(p => p.status === 'failed')
  
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

  useEffect(() => {
    if (processingProjects.length > 0) {
      refreshIntervalRef.current = setInterval(refreshProjects, 5000)
    } else if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
    return () => {
      if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current)
    }
  }, [processingProjects.length, getToken])

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Unauthorized: No token found')
      }
      await deleteProject(deleteConfirmId, token)
      setProjects(projects.filter(p => p.project_id !== deleteConfirmId))
      setDeleteConfirmId(null)
      router.refresh()
    } catch (error) {
      console.error('Failed to delete project:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getMotivationalMessage = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return "Big things have small beginnings."
      case 'intermediate':
        return "Complexity is your playground."
      case 'advanced':
        return "Architecting the future."
      default:
        return "Build your vision."
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20">Ready</Badge>
      case 'processing':
      case 'created':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border-blue-500/20 animate-pulse">Processing</Badge>
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">My Projects</h1>
            <p className="text-zinc-500">Manage and track your AI-powered learning roadmaps.</p>
          </div>
          
          <div className="flex items-center gap-4">
            {mounted && (
              <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)} className="hidden sm:block">
                <TabsList className="bg-zinc-900 border border-zinc-800">
                  <TabsTrigger value="grid" className="data-[state=active]:bg-zinc-800">
                    <LayoutGrid className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="list" className="data-[state=active]:bg-zinc-800">
                    <ListIcon className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="h-10 px-4 text-sm font-medium bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
            >
              <option value="most-recent">Most recent</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="oldest-first">Oldest first</option>
            </select>

            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white rounded-full px-5 h-10 shadow-lg shadow-blue-900/20 transition-all flex items-center justify-start gap-2.5 leading-none"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="relative top-[0.5px]">New Guide</span>
            </Button>
          </div>
        </div>

        {/* Processing State Alert */}
        {processingProjects.length > 0 && (
          <Card className="mb-8 bg-blue-500/5 border-blue-500/20 border shadow-none">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <p className="text-blue-100 font-medium">Generating your GitGuides...</p>
                  <p className="text-blue-400/70 text-sm">
                    {processingProjects.length} project{processingProjects.length > 1 ? 's' : ''} currently being analyzed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Failed Projects */}
        {failedProjects.length > 0 && (
          <div className="mb-10 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Failed to Generate
            </h2>
            <div className="grid grid-cols-1 gap-4">
              {failedProjects.map((project) => (
                <Card key={project.project_id} className="bg-zinc-900 border-zinc-800">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg">{project.project_name}</CardTitle>
                        <CardDescription className="text-zinc-500">{project.github_url}</CardDescription>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-zinc-500 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => setDeleteConfirmId(project.project_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardHeader>
                  {project.error_message && (
                    <CardContent>
                      <p className="text-red-400/80 text-xs bg-red-400/5 border border-red-400/10 rounded-md p-3">
                        {project.error_message}
                      </p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Project Grid/List */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">Your Learning Paths</h2>
          
          {viewType === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {/* Empty state / Create card */}
              <Card 
                className="group border-2 border-dashed border-zinc-800 hover:border-zinc-700 bg-transparent hover:bg-zinc-900/50 transition-all cursor-pointer flex flex-col items-center justify-center min-h-[240px]"
                onClick={() => setIsModalOpen(true)}
              >
                <div className="w-12 h-12 bg-zinc-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-zinc-800">
                  <Plus className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                </div>
                <p className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300">Create new guide</p>
              </Card>

              {sortedProjects.map((project) => (
                <Card 
                  key={project.project_id} 
                  className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all group cursor-pointer relative"
                  onClick={() => router.push(`/project/${project.project_id}`)}
                >
                  {mounted && (
                    <div className="absolute top-4 right-4 z-10" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                          <DropdownMenuItem 
                            className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer"
                            onClick={() => setDeleteConfirmId(project.project_id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}

                  <CardHeader className="pb-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mb-4 shadow-lg shadow-blue-900/20">
                      {project.project_name.charAt(0).toUpperCase()}
                    </div>
                    <CardTitle className="text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                      {project.project_name}
                    </CardTitle>
                    <CardDescription className="line-clamp-1">{project.github_url}</CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pb-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{project.target_days} day roadmap</span>
                      </div>
                    </div>
                  </CardContent>
                  
                      <CardFooter className="pt-0 flex justify-between items-center border-t border-zinc-800/50 mt-2 py-4">
                        {getStatusBadge(project.status)}
                        <span className="text-[10px] text-zinc-500 font-medium italic opacity-70">
                          {getMotivationalMessage(project.skill_level)}
                        </span>
                      </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedProjects.map((project) => (
                <div 
                  key={project.project_id}
                  className="group flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all cursor-pointer"
                  onClick={() => router.push(`/project/${project.project_id}`)}
                >
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0">
                    {project.project_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium group-hover:text-blue-400 transition-colors truncate">
                      {project.project_name}
                    </h3>
                    <p className="text-zinc-500 text-xs truncate">{project.github_url}</p>
                  </div>

                  <div className="hidden md:flex flex-col items-end gap-1 text-[11px] text-zinc-500 px-4 border-x border-zinc-800 h-8 justify-center">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {project.target_days} days
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDate(project.created_at)}
                    </span>
                  </div>

                      <div className="flex items-center gap-4 ml-2">
                        <span className="hidden xl:inline text-[10px] text-zinc-600 italic mr-2 opacity-60">
                          {getMotivationalMessage(project.skill_level)}
                        </span>
                        {getStatusBadge(project.status)}
                        {mounted && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-white">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-zinc-300">
                              <DropdownMenuItem 
                                className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmId(project.project_id);
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        onProjectCreated={refreshProjects}
      />

      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
          <DialogHeader>
            <DialogTitle className="text-white">Delete Project</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Are you sure you want to delete this project? This will permanently remove all learning data, code chunks, and vector embeddings. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 mt-4">
            <Button 
              variant="ghost" 
              onClick={() => setDeleteConfirmId(null)}
              disabled={isDeleting}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {isDeleting ? 'Deleting...' : 'Delete Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
