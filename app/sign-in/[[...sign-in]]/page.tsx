import { SignIn } from "@clerk/nextjs";

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
            <p className="mt-2 text-[13px] text-zinc-500">
              GitGuide is a platform that allows you to learn from any GitHub
              repository.
            </p>
          </div>
          <SignIn
            routing="path"
            path="/sign-in"
            forceRedirectUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "shadow-none border border-zinc-200 rounded-lg",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                footer: "hidden",
                footerAction: "hidden",
                footerActionText: "hidden",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
