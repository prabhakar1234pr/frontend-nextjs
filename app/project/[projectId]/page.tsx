import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Header from '../../components/Header'
import { getProject, type Project } from '../../lib/api'

interface ProjectPageProps {
  params: Promise<{
    projectId: string
  }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Await params in Next.js 16
  const { projectId } = await params

  if (!projectId) {
    redirect('/dashboard')
  }

  let project: Project | null = null
  let error: string | null = null

  try {
    const response = await getProject(projectId)
    if (response.success) {
      project = response.project
    }
  } catch (err) {
    error = err instanceof Error ? err.message : 'Failed to load project'
  }

  if (error || !project) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-[#2f3338]">
          <div className="max-w-7xl mx-auto px-8 py-8">
            <div className="max-w-2xl mx-auto">
              <h1 className="text-3xl font-semibold text-white mb-4">
                Project Not Found
              </h1>
              <p className="text-zinc-400 mb-6">{error || 'Project could not be loaded'}</p>
              <a 
                href="/dashboard"
                className="inline-block px-5 py-2.5 text-[14px] font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#2f3338]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-semibold text-white mb-2">
              {project.project_name}
            </h1>
            <p className="text-zinc-400 mb-8">
              Status: <span className="capitalize text-white">{project.status}</span>
            </p>
            
            <div className="bg-[#3f4449] rounded-lg p-6 space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">GitHub Repository</p>
                <a 
                  href={project.github_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-white hover:text-zinc-300 underline break-all"
                >
                  {project.github_url}
                </a>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Skill Level</p>
                  <p className="text-white capitalize">{project.skill_level}</p>
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Target Duration</p>
                  <p className="text-white">{project.target_days} days</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-zinc-400 mb-1">Created</p>
                <p className="text-white">
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
            
            <div className="mt-8 text-center text-zinc-400">
              <p>Project page will be designed here later</p>
              <a 
                href="/dashboard"
                className="inline-block mt-4 px-5 py-2.5 text-[14px] font-medium text-white bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

