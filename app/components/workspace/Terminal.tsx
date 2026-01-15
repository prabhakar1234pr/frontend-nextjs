'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useTerminal, ConnectionStatus } from '../../hooks/useTerminal'

// Debug logging helper
const DEBUG = process.env.NODE_ENV === 'development'
const log = (tag: string, ...args: unknown[]) => {
  if (DEBUG) console.log(`[Terminal:${tag}]`, ...args)
}

// Dynamic import for xterm to avoid SSR issues
let Terminal: typeof import('@xterm/xterm').Terminal | null = null
let FitAddon: typeof import('@xterm/addon-fit').FitAddon | null = null
let WebLinksAddon: typeof import('@xterm/addon-web-links').WebLinksAddon | null = null

interface TerminalProps {
  workspaceId: string
  sessionId?: string
  onSessionCreated?: (sessionId: string) => void
  onClose?: () => void
  isActive?: boolean
}

export default function TerminalComponent({
  workspaceId,
  sessionId: initialSessionId,
  onSessionCreated,
  onClose,
  isActive = true,
}: TerminalProps) {
  const { getToken } = useAuth()
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<import('@xterm/xterm').Terminal | null>(null)
  const fitAddonRef = useRef<import('@xterm/addon-fit').FitAddon | null>(null)
  const listenersRef = useRef<import('@xterm/xterm').IDisposable[]>([])
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const initializedRef = useRef(false)
  const terminalReadyRef = useRef(false)
  const [token, setToken] = useState<string | null>(null)
  const [terminalReady, setTerminalReady] = useState(false)

  // Terminal hook callbacks
  const handleOutput = useCallback((data: string) => {
    log('OUTPUT', `Received ${data.length} chars`)
    if (!terminalReadyRef.current || !terminalRef.current) return
    terminalRef.current.write(data)
  }, [])

  const handleConnected = useCallback((sessionId: string) => {
    log('CONNECTED', `Session: ${sessionId}`)
    onSessionCreated?.(sessionId)
  }, [onSessionCreated])

  const handleError = useCallback((message: string) => {
    log('ERROR', message)
    if (!terminalReadyRef.current || !terminalRef.current) return
    terminalRef.current.write(`\r\n\x1b[31mError: ${message}\x1b[0m\r\n`)
  }, [])

  const handleDisconnect = useCallback(() => {
    log('DISCONNECT', 'Disconnected from terminal')
    if (!terminalReadyRef.current || !terminalRef.current) return
    terminalRef.current.write('\r\n\x1b[33mDisconnected from terminal\x1b[0m\r\n')
  }, [])

  // Initialize terminal hook (will be connected after token is fetched)
  const {
    status,
    connect,
    disconnect,
    sendInput,
    resize,
  } = useTerminal({
    workspaceId,
    token: token || '',
    sessionId: initialSessionId,
    onOutput: handleOutput,
    onConnected: handleConnected,
    onError: handleError,
    onDisconnect: handleDisconnect,
    autoReconnect: true,
    reconnectDelay: 3000,
  })

  // Load xterm modules dynamically
  useEffect(() => {
    let mounted = true
    log('LOAD', 'Loading xterm modules...')

    async function loadXterm() {
      if (Terminal && FitAddon && WebLinksAddon) {
        log('LOAD', 'xterm modules already loaded')
        return
      }

      const [xtermModule, fitModule, webLinksModule] = await Promise.all([
        import('@xterm/xterm'),
        import('@xterm/addon-fit'),
        import('@xterm/addon-web-links'),
      ])

      if (!mounted) return

      Terminal = xtermModule.Terminal
      FitAddon = fitModule.FitAddon
      WebLinksAddon = webLinksModule.WebLinksAddon
      log('LOAD', 'xterm modules loaded successfully')

      // Force re-render to initialize terminal
      initializeTerminal()
    }

    loadXterm()

    return () => {
      mounted = false
    }
  }, [])

  // Initialize terminal instance
  const initializeTerminal = useCallback(() => {
    log('INIT', `Container: ${!!containerRef.current}, Terminal: ${!!Terminal}, Already init: ${!!terminalRef.current}`)
    
    // Safety checks: ensure refs and container exist, and container has dimensions
    if (!containerRef.current || !Terminal || !FitAddon || !WebLinksAddon) return
    if (terminalRef.current) return // Already initialized

    // Defensive check: xterm open/fit fails if container has no dimensions (display: none)
    const rect = containerRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      log('INIT', 'Container has no dimensions, deferring initialization')
      return
    }

    log('INIT', 'Initializing terminal instance...')
    // xterm CSS is imported globally via app/globals.css (avoids TS errors on dynamic CSS imports)

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#d4d4d4',
        cursor: '#aeafad',
        cursorAccent: '#1a1a1a',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)

    try {
      term.open(containerRef.current)
      fitAddon.fit()
      
      terminalRef.current = term
      fitAddonRef.current = fitAddon
      setTerminalReady(true)
      terminalReadyRef.current = true
      log('INIT', 'Terminal instance created and opened')

    // Handle terminal input
    const dataListener = term.onData((data) => {
      log('INPUT', `Sending ${data.length} chars`)
      sendInput(data)
    })

    // Handle resize
    const resizeListener = term.onResize(({ cols, rows }) => {
      resize(cols, rows)
    })

    listenersRef.current = [dataListener, resizeListener]

      // Show connecting message
      term.write('Connecting to container...\r\n')
    } catch (err) {
      console.error('Failed to open/fit terminal:', err)
      term.dispose()
    }
  }, [sendInput, resize, isActive])

  // Initialize terminal when container is ready AND active
  useEffect(() => {
    if (isActive && containerRef.current && Terminal && !terminalRef.current) {
      initializeTerminal()
    }
  }, [initializeTerminal, isActive])

  // Set up resize observer separately
  useEffect(() => {
    if (!containerRef.current) return

    resizeObserverRef.current = new ResizeObserver(() => {
      if (fitAddonRef.current && isActive && terminalRef.current) {
        try {
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect && rect.width > 0 && rect.height > 0) {
            fitAddonRef.current.fit()
          }
        } catch (e) {
          // Terminal may be disposed
        }
      } else if (!terminalRef.current && isActive && Terminal) {
        // Try initializing if it wasn't due to dimensions
        initializeTerminal()
      }
    })

    resizeObserverRef.current.observe(containerRef.current)
    return () => {
      resizeObserverRef.current?.disconnect()
    }
  }, [isActive, initializeTerminal])

  // Fetch token when terminal is ready
  useEffect(() => {
    log('TOKEN_EFFECT', `terminalReady: ${terminalReady}, hasToken: ${!!token}`)
    if (!terminalReady) return
    if (token) return // Already have token

    let mounted = true

    async function fetchToken() {
      log('TOKEN', 'Fetching auth token...')
      try {
        const newToken = await getToken()
        if (!newToken || !mounted) {
          log('TOKEN', `Token fetch result: token=${!!newToken}, mounted=${mounted}`)
          return
        }
        log('TOKEN', 'Token fetched successfully')
        setToken(newToken)
      } catch (err) {
        console.error('Failed to get token:', err)
        log('TOKEN', `Token fetch error: ${err}`)
        terminalRef.current?.write('\r\n\x1b[31mAuthentication failed\x1b[0m\r\n')
      }
    }

    fetchToken()

    return () => {
      mounted = false
    }
  }, [getToken, token, terminalReady])

  // Connect when token becomes available
  useEffect(() => {
    log('CONNECT_EFFECT', `token: ${!!token}, terminalReady: ${terminalReady}, initialized: ${initializedRef.current}`)
    if (!token || !terminalReady) return
    if (initializedRef.current) return

    log('CONNECT', 'Initiating WebSocket connection...')
    initializedRef.current = true
    connect()
  }, [token, connect, terminalReady])

  // Handle active state changes
  useEffect(() => {
    if (isActive && fitAddonRef.current && terminalRef.current) {
      // Fit terminal when tab becomes active
      setTimeout(() => {
        try {
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect && rect.width > 0 && rect.height > 0) {
            fitAddonRef.current?.fit()
            terminalRef.current?.focus()
          }
        } catch (e) {
          // Terminal may be disposed
        }
      }, 50) // Small delay to ensure display: block has taken effect
    }
  }, [isActive])

  // Cleanup
  useEffect(() => {
    return () => {
      log('CLEANUP', 'Disposing terminal components...')
      disconnect()
      terminalReadyRef.current = false
      
      // Clean up listeners explicitly
      listenersRef.current.forEach(l => l.dispose())
      listenersRef.current = []

      terminalRef.current?.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [disconnect])

  // Focus terminal on click
  const handleContainerClick = useCallback(() => {
    terminalRef.current?.focus()
  }, [])

  return (
    <div className="h-full flex flex-col bg-[#1a1a1a]">
      {/* Terminal content */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 cursor-text"
        style={{ padding: '4px' }}
        onClick={handleContainerClick}
      />

      {/* Status bar */}
      <div className="flex items-center justify-between px-2 py-1 text-xs border-t border-zinc-800 bg-[#252526]">
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <span className="text-zinc-500">
            {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Close terminal"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

function StatusIndicator({ status }: { status: ConnectionStatus }) {
  const colors: Record<ConnectionStatus, string> = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500 animate-pulse',
    disconnected: 'bg-zinc-500',
    error: 'bg-red-500',
  }

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
  )
}

