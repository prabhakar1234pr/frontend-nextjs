'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { sendChatMessage, type ChatMessage } from '../../lib/api-chatbot'

interface RoadmapContext {
  day_number: number | null
  day_theme: string | null
  concept_title: string | null
  subconcept_title: string | null
}

interface ChatbotWidgetProps {
  projectId: string
  roadmapContext?: RoadmapContext
}

export default function ChatbotWidget({ projectId, roadmapContext }: ChatbotWidgetProps) {
  const { getToken } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!message.trim() || isLoading) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
    }

    // Add user message immediately
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setMessage('')
    setIsLoading(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required. Please sign in.')
      }

      // Get conversation history (all previous messages, excluding the one we just added)
      // The API will add the current message, so we send all previous messages
      const conversationHistory = messages

      // Call API with context
      const response = await sendChatMessage(
        projectId,
        userMessage.content,
        conversationHistory,
        token,
        roadmapContext
      )

      // Add AI response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.response,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message'
      setError(errorMessage)
      // Remove the user message if API call failed
      setMessages((prev) => prev.slice(0, -1))
      console.error('Chat error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isCollapsed) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-12 h-12 bg-[#3f4449] hover:bg-[#4f5459] border border-white/10 rounded-full shadow-lg shadow-black/30 transition-all duration-200 flex items-center justify-center hover:scale-105"
        >
          <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 h-[500px] flex flex-col bg-[#3f4449] rounded-2xl shadow-2xl shadow-black/40 border border-white/10">
      <div className="bg-[#3f4449] rounded-2xl border border-white/10 w-full h-full flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-[#2f3338] px-4 py-3 rounded-t-2xl border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-medium">AI Tutor</p>
              <p className="text-zinc-400 text-xs">Online</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCollapsed(true)}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Chat Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-zinc-400 text-sm py-8">
              {roadmapContext?.concept_title ? (
                <>
                  <p className="text-white font-medium mb-2">
                    {roadmapContext.day_number !== null && `Day ${roadmapContext.day_number}`}
                    {roadmapContext.concept_title && ` • ${roadmapContext.concept_title}`}
                  </p>
                  <p className="text-xs mt-2">
                    {roadmapContext.subconcept_title 
                      ? `Need help with "${roadmapContext.subconcept_title}"?`
                      : `Do you have questions about "${roadmapContext.concept_title}"?`
                    }
                  </p>
                </>
              ) : (
                <>
                  <p>Start a conversation with your AI tutor</p>
                  <p className="text-xs mt-2">Ask questions about your codebase</p>
                </>
              )}
            </div>
          )}
          
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 bg-white/10 rounded-full flex-shrink-0"></div>
              )}
              <div
                className={`rounded-lg px-3 py-2 max-w-[80%] ${
                  msg.role === 'user'
                    ? 'bg-white/10 text-white'
                    : 'bg-[#2f3338] text-white'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 bg-white/10 rounded-full flex-shrink-0"></div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-white/10 rounded-full flex-shrink-0"></div>
              <div className="bg-[#2f3338] rounded-lg px-3 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg px-3 py-2">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              className="flex-1 bg-[#2f3338] border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button 
              onClick={handleSend}
              disabled={!message.trim() || isLoading}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

