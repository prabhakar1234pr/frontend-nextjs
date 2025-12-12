import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Header from '../components/Header'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()

  return (
    <>
      <Header />
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
              Dashboard
            </h1>
            <p className="text-slate-600">
              Welcome back, {user?.firstName || 'User'}
            </p>
          </div>

          <div className="grid gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-500 w-24">Email</span>
                  <span className="text-sm text-slate-900">{user?.emailAddresses[0]?.emailAddress}</span>
                </div>
                <div className="flex items-start">
                  <span className="text-sm font-medium text-slate-500 w-24">User ID</span>
                  <span className="text-sm text-slate-600 font-mono">{user?.id}</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Get Started</h2>
              <p className="text-sm text-slate-600 mb-4">
                Start analyzing GitHub repositories with AI assistance
              </p>
              <button className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors">
                Analyze a repository
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}