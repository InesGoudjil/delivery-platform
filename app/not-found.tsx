import React from "react";
import Link from "next/link";
import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/ui/brand-logo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-[#f6f3ec]">
      <div className="max-w-md w-full rounded-3xl bg-[#141416] border border-white/10 p-8 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
        <div className="flex justify-center pb-1">
          <BrandLogo href="/" size="md" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold font-mono text-primary">404</span>
          <h2 className="text-xl font-bold font-heading text-[#f6f3ec]">
            Frame Not Found
          </h2>
          <p className="text-xs text-[#8e8e93] leading-relaxed">
            The page or project delivery link you are looking for does not exist or has been moved.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <Button
            asChild
            className="rounded-xl bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer h-10 px-6"
          >
            <Link href="/">
              <Home className="size-4 mr-2" /> Back to Workspace
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
