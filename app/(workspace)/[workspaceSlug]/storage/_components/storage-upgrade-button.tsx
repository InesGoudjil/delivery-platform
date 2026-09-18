"use client";

import React, { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StorageUpgradeButton() {
  const [toast, setToast] = useState<string | null>(null);

  const handleUpgrade = () => {
    setToast("Storage upgrade checkout opened!");
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
        onClick={handleUpgrade}
        className="rounded-full bg-[#f5551d] text-black font-bold hover:bg-[#ff8a45] shadow-md shadow-[#f5551d]/20 text-xs cursor-pointer"
      >
        <Zap className="size-3.5 mr-1.5" /> Add +1 TB Storage ($15/mo)
      </Button>
    </>
  );
}
