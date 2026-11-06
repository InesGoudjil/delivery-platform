"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographySpan } from "@/components/ui/typography";

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
  const filters = [
    { id: "all" as const, label: "All Projects", shortLabel: "All", count: totalCount },
    { id: "in_review" as const, label: "Active In-Review", shortLabel: "In-Review", count: inReviewCount },
    { id: "approved" as const, label: "Approved & Ready", shortLabel: "Approved", count: approvedCount },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-0.5">
      <div className="glass-pill rounded-full p-1 flex sm:inline-flex items-center gap-1 border border-border/40 bg-card/60 backdrop-blur-md w-full sm:w-auto min-w-max sm:min-w-0">
        {filters.map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <Button
              key={tab.id}
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onFilterChange(tab.id)}
              className={`rounded-full px-2.5 sm:px-3.5 py-1.5 h-auto text-xs font-semibold gap-1.5 sm:gap-2 transition-all cursor-pointer flex-1 sm:flex-initial justify-center whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <TypographySpan className="hidden sm:inline">{tab.label}</TypographySpan>
              <TypographySpan className="sm:hidden">{tab.shortLabel}</TypographySpan>
              <Badge
                variant={isActive ? "secondary" : "outline"}
                className={`text-[10px] px-1.5 py-0 rounded-full shrink-0 ${
                  isActive
                    ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                    : "bg-muted text-muted-foreground border-border/50"
                }`}
              >
                {tab.count}
              </Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
