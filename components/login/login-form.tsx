"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppImage } from "@/components/ui/app-image";
import { loginAction } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOAuthLogin = async (provider: "google" | "apple") => {
    try {
      setError(null);
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) setError(error.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OAuth sign in failed");
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const res = await loginAction(null, formData);
      if (res?.error) {
        setError(res.error);
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] p-3 sm:p-4 lg:p-6">
      {/* Main Card */}
      <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl border border-white/10 bg-[#141416] shadow-2xl lg:grid-cols-2">
        {/* ================= Left Side ================= */}
        <div className="relative hidden lg:block">
          <AppImage
            src="/images/hero.jpg"
            alt="Hero"
            containerClassName="absolute inset-0 h-full w-full"
          />

          <div className="absolute inset-0 bg-black/45" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#ff9a4e]/20 via-transparent to-[#7a2109]/60" />

          <div className="relative z-10 flex h-full items-end p-8">
            <div className="max-w-md">
              <h2 className="disp mb-3 text-4xl font-black text-white">
                Welcome Back
              </h2>

              <p className="text-base leading-7 text-white/80">
                Continue your cinematic journey. Watch your favorite movies and
                TV shows from anywhere.
              </p>
            </div>
          </div>
        </div>

        {/* ================= Right Side ================= */}
        <div className="flex items-center justify-center bg-[#141416] px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex w-full max-w-md flex-col items-center">
            {/* Logo */}
            <a href="/" className="mb-5">
              <AppImage
                src="/images/logo.svg"
                alt="CineSpace"
                fill={false}
                width={130}
                height={32}
                containerClassName="h-8 w-auto border-0 bg-transparent"
              />
            </a>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className={cn("flex w-full flex-col gap-6", className)}
              {...props}
            >
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="disp text-3xl font-extrabold text-[#f6f3ec]">
                  Login to your account
                </h1>

                <p className="text-sm text-[#9a9a9f]">
                  Enter your email below to login to your account.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className="text-sm font-semibold text-[#f6f3ec]"
                >
                  Email
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isPending}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0b] px-4 py-3 text-sm text-[#f6f3ec] placeholder:text-[#5e5e64] outline-none transition focus:border-[#f5551d] disabled:opacity-50"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-[#f6f3ec]"
                  >
                    Password
                  </label>

                  <a
                    href="#"
                    className="text-xs text-[#9a9a9f] hover:text-[#f5551d]"
                  >
                    Forgot Password?
                  </a>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    required
                    disabled={isPending}
                    className="w-full rounded-xl border border-white/10 bg-[#0a0a0b] px-4 py-3 pr-12 text-sm text-[#f6f3ec] placeholder:text-[#5e5e64] outline-none transition focus:border-[#f5551d] disabled:opacity-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Login */}
              <button
                type="submit"
                disabled={isPending}
                className="flex w-full cursor-pointer items-center justify-center rounded-full bg-[#f5551d] py-3 text-sm font-bold text-[#160a03] transition-all hover:-translate-y-0.5 hover:bg-[#ff8a45] disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#160a03]" />
                ) : (
                  "Login"
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-xs text-[#5e5e64]">
                <span className="h-px flex-1 bg-white/10" />
                Or continue with
                <span className="h-px flex-1 bg-white/10" />
              </div>

              {/* Social Buttons */}
              <div className="flex flex-col gap-3">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("google")}
                  disabled={isPending}
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/20 py-3 text-sm font-semibold text-[#f6f3ec] transition-all hover:-translate-y-0.5 hover:bg-white/10 disabled:opacity-50"
                >
                  <svg
                    viewBox="-3 0 262 262"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid"
                    className="h-5 w-5 shrink-0"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                        fill="#4285F4"
                      ></path>
                      <path
                        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                        fill="#34A853"
                      ></path>
                      <path
                        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
                        fill="#FBBC05"
                      ></path>
                      <path
                        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                        fill="#EB4335"
                      ></path>
                    </g>
                  </svg>
                  Continue with Google
                </button>

                {/* Apple */}
                <button
                  type="button"
                  onClick={() => handleOAuthLogin("apple")}
                  disabled={isPending}
                  className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-full border border-white/20 py-3 text-sm font-semibold text-[#f6f3ec] transition-all hover:-translate-y-0.5 hover:bg-white/10 disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 shrink-0 text-white"
                  >
                    <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
                  </svg>
                  Continue with Apple
                </button>
              </div>

              {/* Footer */}
              <p className="text-center text-sm text-[#9a9a9f]">
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-[#f6f3ec] transition hover:text-[#f5551d]"
                >
                  Sign up
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
