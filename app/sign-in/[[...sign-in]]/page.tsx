import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Sign In Content - Centered */}
      <div className="flex min-h-screen items-center justify-center px-8 py-8">
        <div className="w-full max-w-md -mt-16">
          <div className="mb-6 text-center">
            <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900 mb-2">
              Sign in to GitGuide
            </h1>
            <p className="text-[14px] text-zinc-600">
              Continue your learning journey
            </p>
          </div>
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border border-zinc-200 rounded-lg",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

