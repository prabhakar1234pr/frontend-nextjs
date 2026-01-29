"use client";

import {
  useEffect,
  useState,
  useRef,
  useCallback,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  getConceptDetails,
  markContentRead,
  type ConceptDetails,
} from "../../lib/api-roadmap";

export default function DocsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, isLoaded } = useAuth();

  const conceptId = params.conceptId as string;
  const projectId = searchParams.get("project") || "";

  const [conceptDetails, setConceptDetails] = useState<ConceptDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMarkedComplete, setIsMarkedComplete] = useState(false);
  const [isMarkingComplete, setIsMarkingComplete] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const hasMarkedRef = useRef(false);

  // Fetch concept details
  useEffect(() => {
    async function fetchData() {
      if (!isLoaded || !projectId || !conceptId) return;

      try {
        setLoading(true);
        const token = await getToken();
        if (!token) {
          setError("Authentication required");
          return;
        }

        const data = await getConceptDetails(projectId, conceptId, token);
        setConceptDetails(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load content");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isLoaded, projectId, conceptId, getToken]);

  // Handle scroll progress
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;

    const element = contentRef.current;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    const scrollableHeight = scrollHeight - clientHeight;

    // Calculate progress - user must scroll to 95% to see "finished reading"
    if (scrollableHeight <= 0) {
      setScrollProgress(100);
      return;
    }

    const progress = Math.min(
      100,
      Math.round((scrollTop / scrollableHeight) * 100)
    );
    setScrollProgress(isNaN(progress) || progress < 0 ? 0 : progress);
  }, []);

  // Mark as complete when scrolled to end
  const handleMarkComplete = async () => {
    if (isMarkingComplete || hasMarkedRef.current) return;

    setIsMarkingComplete(true);
    hasMarkedRef.current = true;

    try {
      const token = await getToken();
      if (token && projectId && conceptId) {
        await markContentRead(projectId, conceptId, token);
        setIsMarkedComplete(true);
      }
    } catch (err) {
      console.error("Failed to mark content as read:", err);
      hasMarkedRef.current = false;
    } finally {
      setIsMarkingComplete(false);
    }
  };

  // Handle back navigation
  const handleBack = () => {
    router.push(`/project/${projectId}`);
  };

  // Handle navigation to tasks
  const handleContinueToTasks = () => {
    if (conceptDetails?.tasks && conceptDetails.tasks.length > 0) {
      // Navigate to the first task in the workspace
      const firstTask = conceptDetails.tasks[0];
      // Best-effort fullscreen on entering the Workspace IDE
      if (firstTask.task_type === "coding" && !document.fullscreenElement) {
        try {
          const root = document.documentElement as unknown as {
            requestFullscreen?: () => Promise<void>;
            webkitRequestFullscreen?: () => Promise<void> | void;
            msRequestFullscreen?: () => Promise<void> | void;
          };
          if (root.requestFullscreen) {
            void root.requestFullscreen().catch(() => {});
          } else if (root.webkitRequestFullscreen) {
            void Promise.resolve(root.webkitRequestFullscreen()).catch(
              () => {}
            );
          } else if (root.msRequestFullscreen) {
            void Promise.resolve(root.msRequestFullscreen()).catch(() => {});
          }
        } catch {
          // Ignore
        }
      }
      router.push(`/workspace?task=${firstTask.task_id}`);
    } else {
      // If no tasks, go back to roadmap
      router.push(`/project/${projectId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-stone-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">Loading documentation...</p>
        </div>
      </div>
    );
  }

  if (error || !conceptDetails) {
    return (
      <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-stone-800 mb-2">
            Unable to Load Content
          </h2>
          <p className="text-stone-500 mb-6">
            {error || "The requested content could not be found."}
          </p>
          <button
            onClick={handleBack}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-full font-medium transition-colors"
          >
            ← Back to Roadmap
          </button>
        </div>
      </div>
    );
  }

  const { concept } = conceptDetails;

  // Sanitize markdown content to fix common LLM formatting issues
  const sanitizeMarkdown = (content: string): string => {
    if (!content) return "";

    // Split by lines to process each line
    const lines = content.split("\n");
    let inCodeBlock = false;
    const result: string[] = [];

    for (const line of lines) {
      // Check if this line starts/ends a code block (``` at start of line)
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        result.push(line);
        continue;
      }

      // If we're inside a code block, don't modify
      if (inCodeBlock) {
        result.push(line);
        continue;
      }

      // Fix malformed inline code from LLM (e.g., `````name````setState```````)
      let sanitizedLine = line;

      // Step 1: Normalize all sequences of 2+ backticks to a single backtick
      sanitizedLine = sanitizedLine.replace(/`{2,}/g, "`");

      // Step 2: Fix consecutive inline code that runs together
      // Pattern: `word`word` → `word` `word`
      // This handles cases like `name`setState` where two code items share backticks
      let prevLine = "";
      while (prevLine !== sanitizedLine) {
        prevLine = sanitizedLine;
        sanitizedLine = sanitizedLine.replace(
          /`([^`\s]+)`([^`\s]+)`/g,
          "`$1` `$2`"
        );
      }

      // Step 3: Handle dangling backticks - word followed by backtick at end without opening
      // e.g., "use setState`" → "use `setState`"
      sanitizedLine = sanitizedLine.replace(
        /(\s)([A-Za-z_]\w*)`(?!\w)/g,
        "$1`$2`"
      );

      // Step 4: Handle leading backtick without closing
      // e.g., "`setState is" → "`setState` is"
      sanitizedLine = sanitizedLine.replace(/`([A-Za-z_]\w*)(\s)/g, "`$1`$2");

      result.push(sanitizedLine);
    }

    return result.join("\n");
  };

  const sanitizedContent = sanitizeMarkdown(concept.content || "");

  return (
    <div className="h-screen bg-[#faf9f7] flex flex-col overflow-hidden">
      {/* Minimal Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#faf9f7]/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors group"
          >
            <svg
              className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm text-stone-400">
              {concept.estimated_minutes} min read
            </span>

            {isMarkedComplete && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-sm font-medium">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                Done
              </div>
            )}
          </div>
        </div>

        {/* Elegant Progress Bar */}
        <div className="h-0.5 bg-stone-200/50">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-300 ease-out"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>
      </header>

      {/* Main Reading Area */}
      <main
        ref={contentRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pt-20 pb-40"
      >
        <article className="max-w-[680px] mx-auto px-8">
          {/* Title Section */}
          <header className="pt-12 pb-10 border-b border-stone-200 mb-12">
            <p className="text-amber-600 text-sm font-semibold tracking-wide uppercase mb-4">
              Learning Guide
            </p>
            <h1
              className="text-[2.5rem] leading-[1.15] font-bold text-stone-900 tracking-tight mb-5"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              {concept.title}
            </h1>
            {concept.description && (
              <p
                className="text-xl text-stone-500 leading-relaxed"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {concept.description}
              </p>
            )}
          </header>

          {/* Markdown Content - Optimized for Reading */}
          <div className="docs-content">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1
                    className="text-3xl font-bold text-stone-900 mt-14 mb-6 tracking-tight"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2
                    className="text-2xl font-bold text-stone-900 mt-12 mb-5 tracking-tight"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3
                    className="text-xl font-semibold text-stone-800 mt-10 mb-4"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {children}
                  </h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-semibold text-stone-800 mt-8 mb-3">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p
                    className="text-[1.125rem] leading-[1.8] text-stone-700 mb-6"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="my-6 space-y-3 pl-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-6 space-y-3 pl-1 list-decimal list-inside">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li
                    className="text-[1.0625rem] leading-[1.7] text-stone-700 flex gap-3"
                    style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                  >
                    <span className="text-amber-500 mt-1.5 flex-shrink-0">
                      •
                    </span>
                    <span>{children}</span>
                  </li>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className="text-amber-600 hover:text-amber-700 underline decoration-amber-300 underline-offset-2 hover:decoration-amber-500 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-stone-900">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-stone-600">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-8 pl-6 border-l-4 border-amber-400 bg-amber-50/50 py-4 pr-6 rounded-r-lg">
                    <div
                      className="text-stone-700 italic"
                      style={{
                        fontFamily: 'Georgia, "Times New Roman", serif',
                      }}
                    >
                      {children}
                    </div>
                  </blockquote>
                ),
                hr: () => (
                  <hr className="my-12 border-none h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent" />
                ),
                table: ({ children }) => (
                  <div className="my-8 overflow-x-auto rounded-xl border border-stone-200 shadow-sm">
                    <table className="w-full text-sm border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-gradient-to-b from-stone-100 to-stone-50">
                    {children}
                  </thead>
                ),
                th: ({ children }) => (
                  <th className="px-5 py-3.5 text-left font-semibold text-stone-800 border-b-2 border-stone-200 whitespace-nowrap">
                    {children}
                  </th>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-stone-100 bg-white [&>tr]:hover:bg-amber-50/50 [&>tr]:transition-colors">
                    {children}
                  </tbody>
                ),
                td: ({ children }) => (
                  <td className="px-5 py-3.5 text-stone-600 align-top">
                    {children}
                  </td>
                ),
                code({ className, children, ...props }) {
                  const codeString = String(children).replace(/\n$/, "");

                  // Detect if this is inline code:
                  // - No className with language prefix
                  // - No newlines in content
                  // - Not wrapped by pre (check node parent)
                  const isInline = !className && !codeString.includes("\n");

                  // Handle inline code - must return inline element (span/code)
                  if (isInline) {
                    return (
                      <code
                        className="px-1.5 py-0.5 bg-stone-100 text-amber-700 rounded text-[0.9em] font-mono"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }

                  // Handle code blocks - return null, let pre handle it
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                pre({ children, ...props }) {
                  // Extract code content from children (react-markdown passes a <code> element here)
                  const maybeCodeElement = Array.isArray(children)
                    ? children[0]
                    : children;

                  const codeElement = isValidElement(maybeCodeElement)
                    ? (maybeCodeElement as ReactElement<{
                        className?: string;
                        children?: ReactNode;
                      }>)
                    : null;

                  const className = codeElement?.props?.className || "";
                  const match = /language-(\w+)/.exec(className);
                  const language = match ? match[1] : "text";
                  const codeString = String(
                    codeElement?.props?.children || ""
                  ).replace(/\n$/, "");

                  return (
                    <div className="my-8 rounded-xl overflow-hidden shadow-sm border border-stone-200">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1e1e1e] border-b border-stone-700">
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1.5">
                            <div className="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#febc2e]"></div>
                            <div className="w-3 h-3 rounded-full bg-[#28c840]"></div>
                          </div>
                          <span className="text-xs font-medium text-stone-400 ml-2 uppercase tracking-wider">
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
                          padding: "1.5rem",
                          fontSize: "0.875rem",
                          lineHeight: 1.7,
                          background: "#1e1e1e",
                        }}
                      >
                        {codeString}
                      </SyntaxHighlighter>
                    </div>
                  );
                },
              }}
            >
              {sanitizedContent || "No content available."}
            </ReactMarkdown>
          </div>

          {/* End of Content Indicator */}
          <div className="mt-16 pt-8 border-t border-stone-200 text-center">
            <p className="text-stone-400 text-sm">End of documentation</p>
          </div>
        </article>
      </main>

      {/* Elegant Fixed Bottom Bar */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-t border-stone-200">
        <div className="max-w-3xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="text-sm text-stone-500">
            {/* Show "finished" only when user has scrolled to 95%+ */}
            {scrollProgress >= 95 ? (
              <span className="flex items-center gap-2 text-emerald-600">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                You&apos;ve finished reading!
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Keep reading to unlock completion
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {scrollProgress >= 95 && !isMarkedComplete && (
              <button
                onClick={handleMarkComplete}
                disabled={isMarkingComplete}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-medium transition-all disabled:opacity-50 shadow-lg shadow-emerald-200"
              >
                {isMarkingComplete ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Mark Complete
                  </span>
                )}
              </button>
            )}

            {isMarkedComplete && (
              <button
                onClick={handleContinueToTasks}
                className="px-6 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-full font-medium transition-colors shadow-lg shadow-stone-300"
              >
                Continue to Tasks →
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
