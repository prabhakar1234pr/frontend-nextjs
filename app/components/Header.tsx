import { UserButton, SignedIn, SignedOut } from '@clerk/nextjs'
import Link from 'next/link'

export default function Header() {
  return (
    <header className="border-b border-zinc-700 bg-[#2f3338]">
      <nav className="max-w-7xl mx-auto px-8 h-16 flex items-center justify-between">
        <Link 
          href="/" 
          className="hover:opacity-80 transition-opacity duration-200"
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <span style={{ color: '#fff', display: 'block', lineHeight: 0 }}>
            <svg
              width="140"
              height="45"
              viewBox="0 0 220 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
            >
              <g style={{ color: '#fff' }}>
                <path
                  d="M24 8
                    C14.06 8 6 16.06 6 26
                    C6 35.94 14.06 44 24 44
                    C29.52 44 34.48 41.6 37.88 37.8
                    L33.2 33.6
                    C31.1 36 27.7 38 24 38
                    C17.37 38 12 32.63 12 26
                    C12 19.37 17.37 14 24 14
                    C27.7 14 31.1 16 33.2 18.4
                    L37.88 14.2
                    C34.48 10.4 29.52 8 24 8Z"
                  fill="currentColor"
                />
                <path
                  d="M44 8
                    C34.06 8 26 16.06 26 26
                    C26 35.94 34.06 44 44 44
                    C53.94 44 62 35.94 62 26
                    H44V31H56
                    C54.4 35.4 49.6 38 44 38
                    C37.37 38 32 32.63 32 26
                    C32 19.37 37.37 14 44 14
                    C47.7 14 51.1 16 53.2 18.4
                    L57.88 14.2
                    C54.48 10.4 49.52 8 44 8Z"
                  fill="currentColor"
                />
                <text
                  x="76"
                  y="33"
                  fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
                  fontSize="24"
                  fontWeight="600"
                  fill="currentColor"
                  letterSpacing="-0.02em"
                >
                  GitGuide
                </text>
              </g>
            </svg>
          </span>
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