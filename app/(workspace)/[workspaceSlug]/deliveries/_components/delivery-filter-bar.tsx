"use client";

import React from "react";

interface DeliveryFilterBarProps {
  totalCount: number;
  inReviewCount: number;
  approvedCount: number;
  activeFilter: "all" | "in_review" | "approved";
  onFilterChange: (filter: "all" | "in_review" | "approved") => void;
}

export function DeliveryFilterBar({
  totalCount,
  inReviewCount,
  approvedCount,
  activeFilter,
  onFilterChange,
}: DeliveryFilterBarProps) {
  return (
    <div className="glass-pill rounded-full p-1 inline-flex items-center gap-1">
      <button
        onClick={() => onFilterChange("all")}
        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          activeFilter === "all"
            ? "glass-btn text-white shadow-md"
            : "text-[#aeaeb4] hover:text-[#f6f3ec]"
        }`}
      >
        All Projects ({totalCount})
      </button>
      <button
        onClick={() => onFilterChange("in_review")}
        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          activeFilter === "in_review"
            ? "glass-btn text-white shadow-md"
            : "text-[#aeaeb4] hover:text-[#f6f3ec]"
        }`}
      >
        Active In-Review ({inReviewCount})
      </button>
      <button
        onClick={() => onFilterChange("approved")}
        className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
          activeFilter === "approved"
            ? "glass-btn text-white shadow-md"
            : "text-[#aeaeb4] hover:text-[#f6f3ec]"
        }`}
      >
        Approved &amp; Ready ({approvedCount})
      </button>
    </div>
  );
}
