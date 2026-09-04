"use client";

import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ArchiveManagerButton() {
  const [toast, setToast] = useState<string | null>(null);

  const handleArchive = () => {
    setToast("Opening The Silo Archive Manager...");
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <>
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#f5551d] text-black font-semibold text-xs px-4 py-2.5 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
      <Button
        variant="outline"
        onClick={handleArchive}
        className="rounded-full text-xs font-semibold cursor-pointer shrink-0 border-white/15 bg-white/5 hover:bg-white/10 text-[#f6f3ec]"
      >
        <Upload className="size-3.5 mr-1.5" /> Manage Archive
      </Button>
    </>
  );
}
