import { redirect } from 'next/navigation'
import Header from '../../components/Header'

export default function NewProjectPage({
  searchParams,
}: {
  searchParams: { repo?: string; experience?: string; duration?: string }
}) {
  // This is a placeholder page - you'll design it later
  // For now, just show the data that was passed
  
  if (!searchParams.repo) {
    redirect('/dashboard')
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#2f3338]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-semibold text-white mb-4">
              Project Created!
            </h1>
            <div className="bg-[#3f4449] rounded-lg p-6 space-y-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">GitHub Repository</p>
                <p className="text-white">{searchParams.repo}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-1">Experience Level</p>
                <p className="text-white capitalize">{searchParams.experience}</p>
              </div>
              <div>
                <p className="text-sm text-zinc-400 mb-1">Target Duration</p>
                <p className="text-white">{searchParams.duration} days</p>
              </div>
            </div>
            <p className="text-zinc-400 mt-6 text-center">
              This page will be designed later. For now, your project data has been captured.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

