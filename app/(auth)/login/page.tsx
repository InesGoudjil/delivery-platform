import Link from "next/link";
import { Film } from "lucide-react";

import { LoginForm } from "@/components/login/login-form";
import { AmbientBackground } from "@/components/ui/ambient-background";

export default function LoginPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2 relative overflow-hidden">
      <AmbientBackground variant="subtle" />
      <div className="flex flex-col gap-4 p-6 md:p-10 relative z-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-medium transition-opacity hover:opacity-90"
          >
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#f5551d] text-[#160a03] font-bold">
              <Film className="size-4 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              CineSpace
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block overflow-hidden">
        <img
          src="/images/hero.jpg"
          alt="CineSpace Studio"
          className="absolute inset-0 h-full w-full object-cover brightness-[0.7] dark:brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-black/50 backdrop-blur-md px-3 py-1 text-xs font-mono uppercase tracking-wider text-[#ff8a45] border border-white/10">
              Studio Delivery Platform
            </span>
          </div>
          <div className="space-y-2 max-w-lg">
            <p className="text-xl font-medium text-white/95 leading-snug">
              &ldquo;CineSpace pairs client delivery with a filmmaker portfolio
              that actually gets you your next job.&rdquo;
            </p>
            <p className="text-sm text-white/60 font-mono">
              Deliver films like a studio.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
