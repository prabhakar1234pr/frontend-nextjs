"use client";

import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Loader2, Plus, History } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Task, Concept } from "../../lib/api-roadmap";
import type { TaskVerificationResponse } from "../../lib/api-verification";
import {
  sendTaskChatMessage,
  loadTaskConversation,
  listTaskConversations,
  type ConversationListItem,
  type TaskChatMessage,
} from "../../lib/api-task-chatbot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UserCodeFile {
  path: string;
  content: string;
}

interface ChatPanelProps {
  task: Task;
  concept: Concept;
  verificationResult: TaskVerificationResponse | null;
  userCode: UserCodeFile[];
  workspaceId?: string;
  projectId?: string;
}

export default function ChatPanel({
  task,
  concept,
  verificationResult,
  userCode,
  workspaceId,
  projectId,
}: ChatPanelProps) {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationListItem[]>([]);
  const [isLoadingHistoryList, setIsLoadingHistoryList] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reuse the docs page sanitizer to fix malformed inline-code backticks from LLMs
  const sanitizeMarkdown = (content: string): string => {
    if (!content) return "";

    const lines = content.split("\n");
    let inCodeBlock = false;
    const result: string[] = [];

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        result.push(line);
        continue;
      }

      if (inCodeBlock) {
        result.push(line);
        continue;
      }

      let sanitizedLine = line;
      sanitizedLine = sanitizedLine.replace(/`{2,}/g, "`");

      let prevLine = "";
      while (prevLine !== sanitizedLine) {
        prevLine = sanitizedLine;
        sanitizedLine = sanitizedLine.replace(
          /`([^`\s]+)`([^`\s]+)`/g,
          "`$1` `$2`"
        );
      }

      sanitizedLine = sanitizedLine.replace(
        /(\s)([A-Za-z_]\w*)`(?!\w)/g,
        "$1`$2`"
      );

      sanitizedLine = sanitizedLine.replace(/`([A-Za-z_]\w*)(\s)/g, "`$1`$2");

      result.push(sanitizedLine);
    }

    return result.join("\n");
  };

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        setIsLoadingHistory(true);
        const token = await getToken();
        if (!token || !task.task_id) {
          // Show welcome message if no token/task
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hi! I'm here to help you with "${task.title}". What would you like to know?`,
              timestamp: new Date(),
            },
          ]);
          setIsLoadingHistory(false);
          return;
        }

        const conversation = await loadTaskConversation(task.task_id, token);
        setConversationId(conversation.conversation_id);

        if (conversation.messages.length > 0) {
          // Convert API messages to ChatMessage format
          const loadedMessages: ChatMessage[] = conversation.messages.map(
            (msg, index) => ({
              id: `${msg.created_at}-${index}`,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
            })
          );
          setMessages(loadedMessages);
        } else {
          // No history - show welcome message
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content: `Hi! I'm here to help you with "${task.title}". I have access to your current task details, concept content, and your code. I can help clarify concepts, provide guidance, or answer questions about what you're working on. What would you like to know?`,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (error) {
        console.error("Failed to load conversation history:", error);
        // Show welcome message even if loading fails (including 404)
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hi! I'm here to help you with "${task.title}". I have access to your current task details, concept content, and your code. What would you like to know?`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, [task.task_id, task.title, getToken]);

  const resetToNewChat = () => {
    setConversationId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `Hi! I'm here to help you with "${task.title}". What would you like to know?`,
        timestamp: new Date(),
      },
    ]);
  };

  const openHistory = async () => {
    try {
      setIsHistoryOpen(true);
      setIsLoadingHistoryList(true);
      const token = await getToken();
      if (!token || !task.task_id) return;
      const items = await listTaskConversations(task.task_id, token);
      setHistoryItems(items);
    } catch (e) {
      console.error("Failed to load conversation list:", e);
      setHistoryItems([]);
    } finally {
      setIsLoadingHistoryList(false);
    }
  };

  const loadConversationById = async (id: string) => {
    try {
      const token = await getToken();
      if (!token || !task.task_id) return;
      setIsLoadingHistory(true);
      const conversation = await loadTaskConversation(task.task_id, token, id);
      setConversationId(conversation.conversation_id);

      if (conversation.messages.length > 0) {
        const loadedMessages: ChatMessage[] = conversation.messages.map(
          (msg, index) => ({
            id: `${msg.created_at}-${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          })
        );
        setMessages(loadedMessages);
      } else {
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: `Hi! I'm here to help you with "${task.title}". What would you like to know?`,
            timestamp: new Date(),
          },
        ]);
      }
      setIsHistoryOpen(false);
    } catch (e) {
      console.error("Failed to load conversation:", e);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || isLoadingHistory) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      // Prepare verification data if available
      const verification = verificationResult
        ? {
            passed: verificationResult.passed,
            overall_feedback: verificationResult.overall_feedback,
            issues_found: verificationResult.issues_found || [],
            suggestions: verificationResult.suggestions || [],
            code_quality: verificationResult.code_quality || "",
          }
        : null;

      // Call real API
      const response = await sendTaskChatMessage(
        task.task_id,
        {
          message: messageText,
          conversation_id: conversationId,
          user_code: userCode,
          verification,
        },
        token
      );

      // Update conversation ID if this was a new conversation
      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "assistant",
        content:
          error instanceof Error
            ? `Sorry, I encountered an error: ${error.message}`
            : "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex flex-col h-full bg-[#09090b] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
        <p className="text-zinc-500 text-sm mt-2">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b]">
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-b border-zinc-800">
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800"
          onClick={resetToNewChat}
          disabled={isLoading || isLoadingHistory}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          New chat
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-8 px-3 text-[11px] text-zinc-300 hover:text-white hover:bg-zinc-800"
          onClick={openHistory}
          disabled={isLoading || isLoadingHistory}
        >
          <History className="w-3.5 h-3.5 mr-1.5" />
          History
        </Button>
      </div>
      <ScrollArea className="flex-1 px-4 py-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-800 text-zinc-200"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:my-3 prose-headings:text-zinc-100 prose-p:text-zinc-200 prose-li:text-zinc-200 prose-strong:text-zinc-100 prose-a:text-blue-300 prose-code:text-blue-300 prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-700 prose-pre:rounded-lg prose-pre:p-0">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Avoid a nested <pre> wrapper so code blocks render cleanly
                        pre({ children }) {
                          return <>{children}</>;
                        },
                        code({ className, children, ...props }) {
                          const codeString = String(children).replace(
                            /\n$/,
                            ""
                          );
                          const match = /language-(\w+)/.exec(className || "");
                          const language = match ? match[1] : "text";

                          const isInline = !match && !codeString.includes("\n");
                          if (isInline) {
                            return (
                              <code
                                className="px-1 py-0.5 rounded bg-zinc-900 text-blue-300 font-mono text-[0.9em]"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          }

                          if (match) {
                            return (
                              <div className="my-3 rounded-lg overflow-hidden border border-zinc-700">
                                <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-700">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
                                      <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
                                    </div>
                                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider ml-2">
                                      {language}
                                    </span>
                                  </div>
                                </div>
                                <SyntaxHighlighter
                                  style={oneDark}
                                  language={language}
                                  PreTag="div"
                                  customStyle={{
                                    margin: 0,
                                    borderRadius: 0,
                                    padding: "0.9rem",
                                    fontSize: "0.75rem",
                                    lineHeight: 1.6,
                                    background: "#09090b",
                                  }}
                                >
                                  {codeString}
                                </SyntaxHighlighter>
                              </div>
                            );
                          }

                          return (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {sanitizeMarkdown(message.content)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-[12px] leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
                <p className="text-[10px] mt-1 opacity-60">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {message.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-zinc-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-zinc-300" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-zinc-800 rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t border-zinc-800 p-4 shrink-0">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the task, concepts, or get help..."
            className="flex-1 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 text-[12px] h-9"
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white h-9 px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-500 mt-2 text-center">
          Chatbot has access to your task details and generated content
        </p>
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="bg-[#0b0b0d] border border-zinc-800 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Past conversations</DialogTitle>
          </DialogHeader>

          {isLoadingHistoryList ? (
            <div className="flex items-center gap-2 text-zinc-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </div>
          ) : historyItems.length === 0 ? (
            <p className="text-sm text-zinc-400">
              No previous conversations yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-[50vh] overflow-auto pr-1">
              {historyItems.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadConversationById(c.id)}
                  className="w-full text-left rounded-md border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900 transition-colors px-3 py-2"
                >
                  <div className="text-[12px] text-zinc-100 line-clamp-2">
                    {c.title?.trim() ? c.title : "Untitled chat"}
                  </div>
                  {c.updated_at && (
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {new Date(c.updated_at).toLocaleString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
