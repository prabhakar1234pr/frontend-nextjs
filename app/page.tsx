import { SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import Header from './components/Header'

export default function Home() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center space-y-8">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900">
              AI Tutor for GitHub Repositories
            </h1>
            
            <SignedOut>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Learn from any GitHub repository with AI-powered explanations and interactive tutorials
              </p>
              <div className="flex gap-4 justify-center pt-4">
                <Link 
                  href="/sign-up"
                  className="px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Get started
                </Link>
                <Link 
                  href="/sign-in"
                  className="px-6 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </SignedOut>
            
            <SignedIn>
              <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                Welcome back. Continue exploring repositories with AI assistance.
              </p>
              <Link 
                href="/dashboard"
                className="inline-block px-6 py-3 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Go to dashboard
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>
    </>
  )
}