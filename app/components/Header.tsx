import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="text-lg font-semibold text-slate-900 hover:text-slate-700 transition-colors"
        >
          AI Tutor
        </Link>
        
        <div className="flex items-center gap-6">
          <SignedOut>
            <Link 
              href="/sign-in" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign in
            </Link>
            <Link 
              href="/sign-up"
              className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Get started
            </Link>
          </SignedOut>
          
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Dashboard
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </nav>
    </header>
  )
}