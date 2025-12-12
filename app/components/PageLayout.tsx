import { ReactNode } from 'react'

interface PageLayoutProps {
  children: ReactNode
  className?: string
}

export default function PageLayout({ children, className = '' }: PageLayoutProps) {
  return (
    <div className={`min-h-screen bg-slate-50 ${className}`}>
      {children}
    </div>
  )
}

