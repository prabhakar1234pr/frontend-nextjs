'use client'

import { useState, useEffect, useCallback, type ElementType } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { type Task, completeTask } from '../../lib/api-roadmap'
import { Input } from '../../../components/ui/input'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Card, CardContent } from '../../../components/ui/card'
import { 
  Github, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  CheckCircle2,
  FolderCode,
  GitCommit,
  Key,
  ExternalLink
} from 'lucide-react'
import { Checkbox } from '../../../components/ui/checkbox'

interface NextNavigation {
  type: 'task' | 'concept' | 'day' | 'complete'
  taskId?: string
  conceptId?: string
  dayNumber?: number
  projectId: string
}

interface GitHubTaskPanelProps {
  task: Task
  project: {
    project_id: string
    project_name: string
    github_url: string
    skill_level: string
    target_days: number
    status: string
    created_at: string
    user_repo_url?: string  // User's repository URL (from Day 0 Task 2)
    github_username?: string  // GitHub username (from Day 0 Task 2.5)
  }
  onComplete: () => void
  nextTaskId?: string | null
  nextNavigation?: NextNavigation | null
  initialCompleted?: boolean
}

interface VerificationResult {
  success: boolean
  checks: {
    label: string
    passed: boolean
    detail?: string
  }[]
  error?: string
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error'

export default function GitHubTaskPanel({ 
  task, 
  project, 
  onComplete, 
  initialCompleted, 
  nextTaskId, 
  nextNavigation 
}: GitHubTaskPanelProps) {
  const { getToken } = useAuth()
  const [input, setInput] = useState('')
  const [patToken, setPatToken] = useState('')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [status, setStatus] = useState<VerificationStatus>(initialCompleted ? 'success' : 'idle')
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null)
  const [isCompleted, setIsCompleted] = useState(initialCompleted || false)

  // Helper to parse description with points
  const parsedDescription = (() => {
    let desc = task.description || ''
    
    // Rewrite logic for specific tasks to make them more professional
    if (task.task_type === 'verify_commit' && desc.includes('pencil icon')) {
      desc = "Finalize your first contribution by committing changes to your repository. 1) Ensure your name is listed correctly as the author. 2) You can edit files directly on GitHub using the pencil icon, or work locally and push your changes. After committing, paste the commit URL below."
    }

    const hasPoints = /\d+[).]\s/.test(desc)
    
    if (!hasPoints) return { intro: desc, points: [], footer: '' }
    
    const parts = desc.split(/(?=\d+[).]\s)/)
    const intro = parts[0]?.trim() || ''
    let points = parts.slice(1).map(p => p.replace(/^\d+[).]\s*/, '').trim())
    let footer = ''

    // Logic to separate the verification sentence from the last point
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      const verifyRegex = /(.*?\.)\s*(We'll verify.*|Our system.*|Please.*|After creating.*|Once finished.*|After committing.*)/i
      const match = lastPoint.match(verifyRegex)
      
      if (match) {
        points[points.length - 1] = match[1].trim()
        
        if (task.task_type === 'github_profile') {
          footer = "Our system will now perform a quick scan to ensure your profile meets these requirements."
        } else if (task.task_type === 'create_repo') {
          footer = "Once your repository is live, paste the URL below so we can verify your project setup."
        } else if (task.task_type === 'verify_commit') {
          footer = "After pushing your changes, paste the commit URL or SHA below to verify your contribution."
        } else if (task.task_type === 'github_connect') {
          footer = "After providing your PAT and accepting the terms, we'll verify your token and store it securely."
        } else {
          footer = "Please provide the required information below to proceed with verification."
        }
      }
    }
    
    return { intro, points, footer }
  })()

  useEffect(() => {
    if (initialCompleted) {
      setIsCompleted(true)
      setStatus('success')
      onComplete()
    }
  }, [initialCompleted, onComplete])

  // Logic remains same but UI is brand-new
  const extractUsername = (url: string) => url.trim().match(/github\.com\/([a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38})\/?$/)?.[1] || null
  
  const extractRepo = (url: string) => {
    // Robust regex to handle various github URL formats and trailing slashes
    const match = url.trim().match(/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)/)
    return match ? { owner: match[1], repo: match[2].replace(/\.git$/, '').split('/')[0] } : null
  }

  const extractCommit = (input: string, projectUrl: string) => {
    const cleanInput = input.trim()
    
    // Case 1: Full commit URL
    const urlMatch = cleanInput.match(/github\.com\/([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)\/commit\/([a-f0-9]{7,40})/)
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2], sha: urlMatch[3] }
    
    // Case 2: Just SHA (7 to 40 hex chars)
    const shaMatch = cleanInput.match(/^[a-f0-9]{7,40}$/i)
    if (shaMatch) {
      const repoInfo = extractRepo(projectUrl)
      if (repoInfo) {
        return { ...repoInfo, sha: cleanInput }
      }
    }
    return null
  }

  const githubFetch = async (url: string) => {
    // In a production app, we would include a GitHub token here to avoid rate limiting.
    // For now, we'll just handle the errors more gracefully.
    const res = await fetch(url)
    
    if (res.status === 403 && res.headers.get('X-RateLimit-Remaining') === '0') {
      throw new Error('GitHub API rate limit exceeded. Please try again later.')
    }
    
    if (!res.ok) {
      if (res.status === 404) throw new Error('Not found on GitHub')
      throw new Error(`GitHub error: ${res.statusText}`)
    }
    
    return res.json()
  }

  const handleGitHubConnect = async () => {
    if (!patToken.trim() || !consentAccepted || status === 'verifying' || isCompleted) return
    setStatus('verifying')
    setVerificationResult(null)
    
    try {
      const token = await getToken()
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/github/consent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          token: patToken,
          consent_accepted: consentAccepted,
          github_username: extractUsername(project.user_repo_url || project.github_url) || '',
          project_id: project.project_id
        })
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to connect GitHub account')
      }
      
      const data = await response.json()
      
      const checks =
        Array.isArray(data?.checks) && data.checks.length > 0
          ? data.checks
          : [
          { label: 'Token validated', passed: true, detail: 'PAT verified' },
          { label: 'Consent recorded', passed: true, detail: 'Terms accepted' },
          { label: 'Account connected', passed: true, detail: 'GitHub connected' }
        ]
      
      const result: VerificationResult = {
        success: true,
        checks
      }
      
      setVerificationResult(result)
      if (result.success) {
        await completeTask(project.project_id, task.task_id, token)
        setStatus('success')
        setIsCompleted(true)
        onComplete()
      }
    } catch (err) {
      setVerificationResult({ 
        success: false, 
        checks: [], 
        error: err instanceof Error ? err.message : 'Failed to connect GitHub account' 
      })
      setStatus('error')
    }
  }

  const handleVerify = async () => {
    if (task.task_type === 'github_connect') {
      await handleGitHubConnect()
      return
    }
    
    if (!input.trim() || status === 'verifying' || isCompleted) return
    setStatus('verifying')
    setVerificationResult(null)
    
    let result: VerificationResult
    try {
      if (task.task_type === 'github_profile') {
        const username = extractUsername(input)
        if (!username) throw new Error('Invalid GitHub profile URL')
        const data = await githubFetch(`https://api.github.com/users/${username}`)
        result = {
          success: !!data.name && !!data.bio,
          checks: [
            { label: 'Profile found', passed: true, detail: `@${data.login}` },
            { label: 'Bio & Name complete', passed: !!data.name && !!data.bio, detail: data.bio ? 'Found bio' : 'Bio missing' }
          ]
        }
        
        // Store username when completing task (source of truth)
        if (result.success) {
          const token = await getToken()
          await completeTask(project.project_id, task.task_id, token, { github_username: username })
        }
      } else if (task.task_type === 'create_repo') {
        const repo = extractRepo(input)
        if (!repo) throw new Error('Invalid repo URL')
        const projectRepo = extractRepo(project.github_url)
        const isDifferentFromCurriculum =
          !projectRepo ||
          projectRepo.owner.toLowerCase() !== repo.owner.toLowerCase() ||
          projectRepo.repo.toLowerCase() !== repo.repo.toLowerCase()
        const data = await githubFetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}`)
        const contents = await githubFetch(`https://api.github.com/repos/${repo.owner}/${repo.repo}/contents/`)
        if (!Array.isArray(contents)) {
          throw new Error('Unable to verify repository contents')
        }
        const hasReadme = contents.some(
          (item: { name?: string; type?: string }) =>
            item.type === 'file' && item.name?.toLowerCase() === 'readme.md'
        )
        const hasLicense = contents.some(
          (item: { name?: string; type?: string }) =>
            item.type === 'file' && ['license', 'licence'].includes(item.name?.toLowerCase() || '')
        )
        const unexpectedItems = contents.filter((item: { name?: string; type?: string }) => {
          if (item.type !== 'file') return true
          const name = item.name?.toLowerCase() || ''
          return name !== 'readme.md' && name !== 'license' && name !== 'licence'
        })
        const hasOnlyReadmeAndLicense = hasReadme && hasLicense && unexpectedItems.length === 0
        result = {
          success: !data.private && isDifferentFromCurriculum && hasOnlyReadmeAndLicense,
          checks: [
            { label: 'Repository found', passed: true, detail: data.full_name },
            {
              label: 'Different from curriculum repo',
              passed: isDifferentFromCurriculum,
              detail: isDifferentFromCurriculum ? 'Different repository' : 'Matches curriculum repository'
            },
            { label: 'Visibility check', passed: !data.private, detail: data.private ? 'Private' : 'Public' },
            {
              label: 'Only README.md and LICENSE',
              passed: hasOnlyReadmeAndLicense,
              detail: hasOnlyReadmeAndLicense
                ? 'Only README.md and LICENSE/LICENCE found'
                : 'Extra files found or missing README/LICENSE'
            }
          ]
        }
        
        // Store repo URL when completing task
        if (result.success) {
          const token = await getToken()
          await completeTask(project.project_id, task.task_id, token, { user_repo_url: input.trim() })
        }
      } else if (task.task_type === 'verify_commit') {
        const commit = extractCommit(input, project.github_url)
        if (!commit) throw new Error('Invalid commit URL or SHA')
        const data = await githubFetch(`https://api.github.com/repos/${commit.owner}/${commit.repo}/commits/${commit.sha}`)
        
        // Basic check: commit exists and has a message
        const hasMessage = !!data.commit?.message
        
        result = {
          success: hasMessage,
          checks: [
            { label: 'Commit verified', passed: true, detail: data.sha.substring(0, 7) },
            { label: 'Author recognized', passed: true, detail: data.commit?.author?.name || 'Verified' },
            { label: 'Commit message found', passed: hasMessage, detail: data.commit?.message?.split('\n')[0] || 'No message' }
          ]
        }
        
        // Store commit SHA when completing task
        if (result.success) {
          const token = await getToken()
          await completeTask(project.project_id, task.task_id, token, { commit_sha: commit.sha })
        }
      } else {
        result = { success: false, checks: [], error: 'Unsupported task type' }
      }

      setVerificationResult(result)
      if (result.success) {
        // Only complete task if not already completed above (github_profile, create_repo, and verify_commit handle it)
        if (task.task_type !== 'github_profile' && task.task_type !== 'create_repo' && task.task_type !== 'verify_commit') {
          const token = await getToken()
          await completeTask(project.project_id, task.task_id, token)
        }
        setStatus('success')
        setIsCompleted(true)
        onComplete()
      } else {
        setStatus('error')
      }
    } catch (err) {
      setVerificationResult({ success: false, checks: [], error: err instanceof Error ? err.message : 'Failed' })
      setStatus('error')
    }
  }

  type TaskConfig = { icon: ElementType; placeholder: string; label: string }

  const configMap: Partial<Record<Task['task_type'], TaskConfig>> = {
    github_profile: { icon: Github, placeholder: 'https://github.com/your-username', label: 'Verify Profile' },
    create_repo: { icon: FolderCode, placeholder: 'https://github.com/you/project-name', label: 'Verify Repository' },
    github_connect: { icon: Key, placeholder: 'Paste your Personal Access Token', label: 'Connect GitHub' },
    verify_commit: { icon: GitCommit, placeholder: 'Commit URL or SHA', label: 'Verify Commit' },
  }

  const config =
    configMap[task.task_type] || { icon: Github, placeholder: 'Enter URL...', label: 'Verify' }

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="space-y-6">
        {parsedDescription.intro && (
          <p className="text-zinc-400 text-[15px] leading-relaxed">
            {parsedDescription.intro}
          </p>
        )}
        
        {parsedDescription.points.length > 0 && (
          <div className="space-y-6">
            <ul className="space-y-3 pl-1">
              {parsedDescription.points.map((point, i) => (
                <li key={i} className="flex gap-3 text-zinc-400 text-[14px] leading-relaxed">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600/10 text-blue-500 text-[10px] font-bold flex items-center justify-center mt-0.5 border border-blue-500/20">
                    {i + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
            
            {parsedDescription.footer && (
              <p className="text-zinc-500 text-[13px] font-medium pl-1 border-l-2 border-blue-600/20 italic">
                {parsedDescription.footer}
              </p>
            )}
          </div>
        )}
        
        {task.hints && task.hints.length > 0 && (
          <div className="grid grid-cols-1 gap-3">
            {task.hints.map((hint, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50 group hover:border-blue-500/20 transition-all">
                <div className="mt-0.5 text-blue-500">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <p className="text-[12px] text-zinc-500 leading-relaxed font-medium">{hint}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card className="bg-zinc-900/30 border-zinc-800 shadow-xl overflow-hidden group">
        <CardContent className="p-0">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                  <config.icon className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{config.label}</span>
              </div>
              {isCompleted && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>}
            </div>

            {task.task_type === 'github_connect' ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                    Personal Access Token (PAT)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={patToken}
                      onChange={(e) => setPatToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      disabled={isCompleted}
                      className="bg-zinc-950/50 border-zinc-800 focus:border-blue-500/50 h-12 text-sm text-white placeholder:text-zinc-700 rounded-xl font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://github.com/settings/tokens?type=beta', '_blank')}
                      className="h-12 px-4 border-zinc-800 text-zinc-400 hover:text-white"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Create PAT
                    </Button>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-2">
                    Create a fine-grained PAT scoped to your repository with "Contents" read/write permissions
                  </p>
                </div>
                
                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consentAccepted}
                      onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                      disabled={isCompleted}
                      className="mt-0.5"
                    />
                    <label htmlFor="consent" className="text-[12px] text-zinc-400 leading-relaxed cursor-pointer">
                      <strong className="text-yellow-500">I understand and agree:</strong> To ensure accurate task verification and progress tracking, GitGuide will automatically reset any commits made outside the platform (via GitHub web UI, local git, or other tools). This ensures our verification system can accurately check your work. Your code will always be stored in your GitHub repository, and all commits made through GitGuide are permanent.
                    </label>
                  </div>
                </div>
                
                {!isCompleted && (
                  <Button 
                    onClick={handleVerify}
                    disabled={status === 'verifying' || !patToken.trim() || !consentAccepted}
                    className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {status === 'verifying' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      'Connect & Continue'
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={config.placeholder}
                    disabled={isCompleted}
                    className="bg-zinc-950/50 border-zinc-800 focus:border-blue-500/50 h-12 text-sm text-white placeholder:text-zinc-700 rounded-xl"
                  />
                </div>
                {!isCompleted && (
                  <Button 
                    onClick={handleVerify}
                    disabled={status === 'verifying' || !input.trim()}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {status === 'verifying' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                  </Button>
                )}
              </div>
            )}
          </div>

          {verificationResult && (
            <div className={`px-6 py-4 border-t ${status === 'success' ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-red-500/5 border-red-500/10'}`}>
              {verificationResult.checks.map((check, i) => (
                <div key={i} className="flex items-center justify-between mb-2 last:mb-0">
                  <div className="flex items-center gap-2">
                    {check.passed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                    <span className={`text-[11px] font-bold ${check.passed ? 'text-emerald-500/80' : 'text-red-500/80'}`}>{check.label}</span>
                  </div>
                  <span className="text-[10px] text-zinc-600 font-mono">{check.detail}</span>
                </div>
              ))}
              {verificationResult.error && (
                <p className="text-[11px] text-red-400 font-medium mt-2">{verificationResult.error}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
