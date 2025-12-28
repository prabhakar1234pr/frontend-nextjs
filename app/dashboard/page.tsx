import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import Header from '../components/Header'
import DashboardContent from '../components/dashboard/DashboardContent'
import Loading from './loading'
import { listUserProjects } from '../lib/api'
import { type Project } from '../lib/api'

// Separate component for async data fetching
async function ProjectsLoader() {
  let projects: Project[] = []
  try {
    const response = await listUserProjects()
    if (response.success && response.projects) {
      projects = response.projects
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error)
  }
  return <DashboardContent projects={projects} />
}

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  return (
    <>
      <Header />
      <Suspense fallback={<Loading />}>
        <ProjectsLoader />
      </Suspense>
    </>
  )
}