import { auth, currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Header from '../components/Header'
import { syncUser, listUserProjects } from '../lib/api'
import DashboardContent from '../components/dashboard/DashboardContent'
import { type Project } from '../lib/api'

export default async function DashboardPage() {
  const { userId } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  const user = await currentUser()

  // Sync user to Supabase automatically
  try {
    await syncUser()
  } catch (error) {
    console.error('Failed to sync user:', error)
    // Continue anyway - user sync can happen later or be retried
  }

  // Fetch user's projects from Supabase
  let projects: Project[] = []
  try {
    const response = await listUserProjects()
    if (response.success && response.projects) {
      projects = response.projects
    }
  } catch (error) {
    console.error('Failed to fetch projects:', error)
    // Continue with empty array - projects will show empty state
  }

  return (
    <>
      <Header />
      <DashboardContent projects={projects} />
    </>
  )
}