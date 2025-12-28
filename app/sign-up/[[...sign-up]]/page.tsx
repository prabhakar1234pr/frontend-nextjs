import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="relative min-h-screen bg-white overflow-hidden">
      {/* Sign Up Content - Centered */}
      <div className="flex min-h-screen items-center justify-center px-8 py-8">
        <div className="w-full max-w-md -mt-16">
          <div className="mb-6 text-center">
            <h1 className="text-[24px] font-semibold tracking-tight text-zinc-900 mb-2">
              Get started with GitGuide
            </h1>
            <p className="text-[14px] text-zinc-600">
              Transform repositories into learning journeys
            </p>
          </div>
          <SignUp 
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

