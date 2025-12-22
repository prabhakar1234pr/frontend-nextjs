import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'
import Image from 'next/image'

export default function Header() {
  return (
    <header className="border-b border-zinc-700 bg-[#2f3338]">
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="hover:opacity-80 transition-opacity duration-200"
        >
          <Image 
            src="/logo.png" 
            alt="GitGuide Logo" 
            width={140} 
            height={45}
            className="object-contain"
            priority
          />
        </Link>
        
        <div className="flex items-center gap-8">
          <SignedOut>
            <Link 
              href="/sign-in" 
              className="text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link 
              href="/sign-up"
              className="px-3.5 py-1.5 text-[13px] font-medium text-[#2f3338] bg-white rounded-md hover:bg-zinc-100 transition-all duration-200"
            >
              Get started
            </Link>
          </SignedOut>
          
          <SignedIn>
            <Link 
              href="/dashboard" 
              className="text-[13px] font-medium text-zinc-400 hover:text-zinc-200 transition-colors duration-200"
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