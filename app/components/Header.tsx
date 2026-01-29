"use client";

import { UserButton, SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout, User } from "lucide-react";

export default function Header() {
  const { isLoaded, userId } = useAuth();

  return (
    <header className="border-b border-zinc-800 bg-[#1e1e1e] sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href={isLoaded && userId ? "/dashboard" : "/"}
          className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"
        >
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Layout className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            GitGuide
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {!isLoaded ? (
            <div className="flex items-center gap-4">
              <Skeleton className="w-16 h-4 bg-zinc-800" />
              <Skeleton className="w-24 h-9 bg-zinc-800 rounded-full" />
            </div>
          ) : (
            <>
              <SignedOut>
                <Button
                  variant="ghost"
                  asChild
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 h-9 text-[13px]"
                >
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button
                  asChild
                  className="bg-white text-zinc-950 hover:bg-zinc-200 rounded-full px-5 h-9 text-[13px] font-semibold"
                >
                  <Link href="/sign-up">Get started</Link>
                </Button>
              </SignedOut>

              <SignedIn>
                <Button
                  variant="ghost"
                  asChild
                  className="text-zinc-400 hover:text-white hover:bg-zinc-800 px-3 h-9 text-[13px]"
                >
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
                <div className="pl-3 border-l border-zinc-800 ml-3 flex items-center relative">
                  <UserButton
                    appearance={{
                      elements: {
                        rootBox: "flex items-center justify-center",
                        userButtonTrigger:
                          "focus:outline-none focus:ring-2 focus:ring-blue-600/50 rounded-full transition-all hover:scale-105 active:scale-95",
                        avatarBox:
                          "w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center border border-blue-500 shadow-lg",
                        userButtonAvatarBox: "hidden",
                        userButtonAvatarImage: "hidden",
                        userButtonPopoverCard:
                          "bg-[#18181b] border border-zinc-800 shadow-2xl rounded-xl overflow-hidden min-w-[240px]",
                        userButtonPopoverActionButton:
                          "hover:bg-zinc-800/50 text-zinc-400 hover:text-white transition-colors py-3 px-4",
                        userButtonPopoverActionButtonText:
                          "text-[10px] font-bold uppercase tracking-[0.1em]",
                        userButtonPopoverFooter: "gg-clerk-userbutton-footer",
                        userPreview:
                          "text-white px-5 py-4 border-b border-zinc-800 bg-zinc-900/30",
                        userPreviewMainIdentifier:
                          "text-sm font-bold tracking-tight",
                        userPreviewSecondaryIdentifier:
                          "text-[11px] text-zinc-500 font-medium",
                      },
                    }}
                  />
                  <div className="absolute inset-0 left-3 flex items-center justify-center pointer-events-none">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              </SignedIn>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
