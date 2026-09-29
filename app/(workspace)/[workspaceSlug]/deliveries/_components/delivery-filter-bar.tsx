"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    { id: "all" as const, label: "All Projects", count: totalCount },
    { id: "in_review" as const, label: "Active In-Review", count: inReviewCount },
    { id: "approved" as const, label: "Approved & Ready", count: approvedCount },
  ];

  return (
    <div className="glass-pill rounded-full p-1 inline-flex items-center gap-1 border border-border/40 bg-card/60 backdrop-blur-md">
      {filters.map((tab) => {
        const isActive = activeFilter === tab.id;
        return (
          <Button
            key={tab.id}
            variant={isActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => onFilterChange(tab.id)}
            className={`rounded-full px-3.5 py-1.5 h-auto text-xs font-semibold gap-2 transition-all cursor-pointer ${
              isActive
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>{tab.label}</span>
            <Badge
              variant={isActive ? "secondary" : "outline"}
              className={`text-[10px] px-1.5 py-0 rounded-full font-mono ${
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
  );
}
