import type { Metadata } from "next";
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GitGuide — AI Tutor for GitHub Repositories",
  description: "Transform GitHub repositories into personalized learning journeys with AI-powered explanations and interactive tutorials.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: {
          colorPrimary: '#18181b',
          colorText: '#18181b',
          colorBackground: '#ffffff',
          colorInputBackground: '#ffffff',
          colorInputText: '#18181b',
          borderRadius: '0.375rem',
        },
        elements: {
          formButtonPrimary: 'bg-zinc-900 hover:bg-zinc-800 text-[13px] font-medium normal-case transition-all duration-200',
          socialButtonsBlockButton: 'border-zinc-300 hover:bg-zinc-50 text-[13px] transition-all duration-200',
          socialButtonsBlockButtonText: 'text-zinc-700 font-medium',
          formFieldInput: 'focus:ring-zinc-900 focus:border-zinc-900 text-[14px] border-zinc-300',
          card: 'shadow-none border border-zinc-200',
          footerActionLink: 'text-zinc-900 hover:text-zinc-700',
        },
      }}
    >
      <html lang="en">
        <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
