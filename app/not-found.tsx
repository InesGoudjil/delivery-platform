import React from "react";
import Link from "next/link";
import { Film, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-[#f6f3ec]">
      <div className="max-w-md w-full rounded-3xl bg-[#141416] border border-white/10 p-8 shadow-2xl space-y-6 text-center animate-in fade-in duration-200">
        <div className="size-16 rounded-2xl bg-[#f5551d]/15 border border-[#f5551d]/30 text-[#f5551d] flex items-center justify-center mx-auto">
          <Film className="size-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-extrabold font-mono text-[#f5551d]">404</span>
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
            className="rounded-xl bg-[#f5551d] text-black font-bold text-xs hover:bg-[#ff8a45] cursor-pointer h-10 px-6"
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
