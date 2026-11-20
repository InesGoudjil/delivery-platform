import React from "react";
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton";
import { SKELETON_TEXT } from "../../_components/skeleton-text";

/**
 * Placeholders for the Notifications page. The page fetches its settings and history in the
 * browser, so the same pieces stand in for the data there (page.tsx) and for the whole page while
 * the route loads (loading.tsx): the two never disagree, and nothing jumps in between.
 */

/** A switch's footprint while its value loads (Switch's default size). */
export function SwitchSkeleton() {
  return <Skeleton className="h-[18.4px] w-8 rounded-full" />;
}

/** Rows for the Recent notifications list, laid out like NotificationLogList's rows. */
export function NotificationLogRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
          <div className="flex items-center gap-3 min-w-0">
            <Skeleton className="size-8 rounded-xl shrink-0" />
            <div className="space-y-1.5 min-w-0">
              <Skeleton className="h-3.5 w-44 max-w-full rounded" />
              <Skeleton className="h-3 w-32 max-w-full rounded" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-3.5 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The body of the Studio WhatsApp number card while its state loads: the size of the message box
 * it most often shows (WhatsApp off, or no plan for it); a verified number's row is about as tall.
 */
export function WhatsAppNumberSkeleton() {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 p-4">
      <SkeletonLine className="h-4 w-80 max-w-full" />
    </div>
  );
}

/** Description lines per alert row: Comments has the long one. */
const ALERT_DESCRIPTION_LINES = [["w-72"], ["w-full", "w-3/5"], ["w-80"]];

/** The whole page, for loading.tsx: header, Client activity, WhatsApp number, recent notifications. */
export function NotificationsPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div className="pb-6 border-b border-border">
        <SkeletonLine className="h-4 w-28 mb-1" />
        <SkeletonLine className={`${SKELETON_TEXT.pageTitle} w-52`} />
        <div className="mt-1">
          <SkeletonLine className={`${SKELETON_TEXT.leadLine} w-full max-w-3xl`} />
          <SkeletonLine className={`${SKELETON_TEXT.leadLine} w-1/2`} />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border shadow-sm">
        <div className="px-6 pt-5 pb-3 flex items-end justify-between gap-4 border-b border-border">
          <SkeletonLine className={`${SKELETON_TEXT.cardTitle} w-44`} />
          <div className="flex shrink-0 gap-6">
            <div className="w-14 flex justify-center">
              <Skeleton className="h-3 w-11 rounded" />
            </div>
            <div className="w-14 flex justify-center">
              <Skeleton className="h-3 w-14 rounded" />
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {ALERT_DESCRIPTION_LINES.map((lines, i) => (
            <div key={i} className="px-6 py-5 flex items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0 flex-1">
                <Skeleton className="h-4 w-28 rounded" />
                {lines.map((width, line) => (
                  <Skeleton key={line} className={`h-3 max-w-full rounded ${width}`} />
                ))}
              </div>
              <div className="flex shrink-0 gap-6">
                <div className="w-14 flex justify-center">
                  <SwitchSkeleton />
                </div>
                <div className="w-14 flex justify-center">
                  <SwitchSkeleton />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-border">
          <SkeletonLine className="h-4 w-80 max-w-full" />
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 space-y-5 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <SkeletonLine className={`${SKELETON_TEXT.cardTitle} w-72 max-w-full`} />
          </div>
          <SkeletonLine className="h-4 w-full max-w-2xl" />
        </div>
        <WhatsAppNumberSkeleton />
      </div>

      <div className="rounded-2xl bg-card border border-border p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-40 rounded" />
          <Skeleton className="h-3 w-14 rounded" />
        </div>
        <NotificationLogRowsSkeleton />
      </div>
    </div>
  );
}
