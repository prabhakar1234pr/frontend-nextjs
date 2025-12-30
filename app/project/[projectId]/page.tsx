import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Header from '../../components/Header'
import RoadmapPage from '../../components/roadmap/RoadmapPage'
import { getProject, type Project } from '../../lib/api'

interface ProjectPageProps {
  params: Promise<{
    projectId: string
  }>
}

// Processing state component with animations
function ProcessingState({ status }: { status: string }) {
  const steps = [
    { id: 1, label: 'Cloning repository', done: true },
    { id: 2, label: 'Analyzing code structure', done: status !== 'created' },
    { id: 3, label: 'Generating embeddings', done: false },
    { id: 4, label: 'Building curriculum', done: false },
  ]
  
  return (
    <div className="relative">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl animate-gradient-shift" />
      
      <div className="relative bg-[#3a3f44]/80 backdrop-blur-sm rounded-2xl border border-white/5 p-8 md:p-12">
        <div className="max-w-lg mx-auto text-center">
          {/* Animated icon */}
          <div className="relative w-24 h-24 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-white/10" />
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-400 border-r-purple-400 animate-spin" style={{ animationDuration: '2s' }} />
            {/* Inner glow */}
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-10 h-10 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-2xl font-semibold text-white mb-3">
            Preparing Your Learning Roadmap
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            We&apos;re analyzing your repository and crafting a personalized curriculum. This usually takes 2-5 minutes.
          </p>
          
          {/* Progress steps */}
          <div className="space-y-3 text-left mb-8">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className="flex items-center gap-3 py-2"
                style={{ 
                  opacity: step.done || index === steps.findIndex(s => !s.done) ? 1 : 0.4,
                  animationDelay: `${index * 150}ms`
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  step.done 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : index === steps.findIndex(s => !s.done)
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-zinc-700/50 text-zinc-500'
                }`}>
                  {step.done ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : index === steps.findIndex(s => !s.done) ? (
                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-zinc-500" />
                  )}
                </div>
                <span className={`text-sm ${step.done ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          
          {/* Tip */}
          <div className="bg-white/5 rounded-xl p-4 text-left">
            <p className="text-xs text-zinc-500 mb-1 uppercase tracking-wider font-medium">Pro tip</p>
            <p className="text-sm text-zinc-400">
              While you wait, you can explore other projects or check out the dashboard. We&apos;ll have everything ready when you return!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// Error state component
function ErrorState({ error }: { error: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-[#3a3f44]/80 backdrop-blur-sm rounded-2xl border border-red-500/20 p-8 text-center">
          {/* Error icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h1 className="text-2xl font-semibold text-white mb-3">
            Project Not Found
          </h1>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            {error || 'We couldn\'t load this project. It may have been deleted or you may not have access to it.'}
          </p>
          
          <Link 
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-zinc-900 bg-white hover:bg-zinc-100 rounded-xl transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
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
        <main className="min-h-screen bg-[#2a2e32]">
          {/* Subtle background pattern */}
          <div 
            className="fixed inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
              backgroundSize: '24px 24px'
            }}
          />
          <ErrorState error={error || 'Project could not be loaded'} />
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#2a2e32]">
        {/* Subtle background pattern */}
        <div 
          className="fixed inset-0 opacity-30 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)`,
            backgroundSize: '24px 24px'
          }}
        />
        
        <div className="relative max-w-[1600px] mx-auto">
          {/* Main Content */}
          <div className="px-4 md:px-6 py-3">
            {project.status === 'ready' ? (
              <RoadmapPage projectId={projectId} />
            ) : (
              <ProcessingState status={project.status} />
            )}
          </div>
        </div>
      </main>
      
    </>
  )
}
