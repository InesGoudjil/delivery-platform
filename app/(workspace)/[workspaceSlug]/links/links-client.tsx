"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, Download, Lock, MessageCircle, Search, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TypographyH1, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { bulkUpdateShareLinksAction } from "@/app/actions/share-links";
import { expiryLabel, expiresSoon, shareLinkUrl, timeAgo } from "@/lib/share-links/format";
import type { WorkspaceShareLinkView } from "@/lib/share-links/view";

type Filter = "all" | "active" | "expiring" | "expired" | "revoked";

const FILTERS: ReadonlyArray<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring this week" },
  { id: "expired", label: "Expired" },
  { id: "revoked", label: "Turned off" },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function matches(link: WorkspaceShareLinkView, filter: Filter): boolean {
  switch (filter) {
    case "active":
      return link.status === "active";
    case "expiring":
      return link.status === "active" && expiresSoon(link.expiresAt);
    case "expired":
      return link.status === "expired";
    case "revoked":
      return link.status === "revoked";
    default:
      return true;
  }
}

export function LinksClient({
  workspaceSlug,
  links,
  installed,
  canManage,
}: {
  workspaceSlug: string;
  links: WorkspaceShareLinkView[];
  installed: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // When the page loaded: "expiring this week" and "opened today" count from here.
  const [now] = useState(() => Date.now());

  const stats = useMemo(() => {
    return {
      active: links.filter((l) => l.status === "active").length,
      expiring: links.filter((l) => l.status === "active" && expiresSoon(l.expiresAt, now)).length,
      openedToday: links.filter((l) => l.lastOpenedAt && now - new Date(l.lastOpenedAt).getTime() < DAY_MS).length,
      revoked: links.filter((l) => l.status === "revoked").length,
    };
  }, [links, now]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return links.filter(
      (link) =>
        matches(link, filter) &&
        (!q ||
          link.label.toLowerCase().includes(q) ||
          link.deliveryTitle.toLowerCase().includes(q) ||
          (link.recipientName ?? "").toLowerCase().includes(q) ||
          (link.recipientEmail ?? "").toLowerCase().includes(q))
    );
  }, [links, filter, query]);

  const allVisibleSelected = visible.length > 0 && visible.every((link) => selected.has(link.id));
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const link of visible) {
        if (allVisibleSelected) next.delete(link.id);
        else next.add(link.id);
      }
      return next;
    });
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const bulk = (action: "revoke" | "extend" | "downloads_off") => {
    const linkIds = [...selected];
    if (linkIds.length === 0) return;
    if (action === "revoke" && !window.confirm(`Turn off ${linkIds.length} link(s)? Their URLs stop working. Main links stay on.`)) {
      return;
    }
    startTransition(async () => {
      const res = await bulkUpdateShareLinksAction(workspaceSlug, { linkIds, action });
      if (res.success === false) {
        toast.error(res.error);
        return;
      }
      toast.success(
        res.changed === 0
          ? "Nothing to change for those links."
          : `${res.changed} link${res.changed === 1 ? "" : "s"} updated.`
      );
      setSelected(new Set());
      router.refresh();
    });
  };

  const copy = async (link: WorkspaceShareLinkView) => {
    await navigator.clipboard.writeText(shareLinkUrl(link.token));
    setCopiedId(link.id);
    setTimeout(() => setCopiedId((id) => (id === link.id ? null : id)), 1800);
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      <div className="space-y-1">
        <TypographyH1 className="text-3xl font-bold font-heading text-foreground">Client Links</TypographyH1>
        <TypographyMuted className="text-sm text-muted-foreground">
          Every link you&apos;ve shared, across all deliveries. Open a delivery to create or edit its links.
        </TypographyMuted>
      </div>

      {!installed ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Links will show here once managing several links per delivery is switched on.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Active", value: stats.active },
              { label: "Expiring this week", value: stats.expiring },
              { label: "Opened today", value: stats.openedToday },
              { label: "Turned off", value: stats.revoked },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-border bg-card px-4 py-3">
                <TypographySpan className="block text-2xl font-bold text-foreground tabular-nums">{stat.value}</TypographySpan>
                <TypographySpan className="block text-[11px] text-muted-foreground">{stat.label}</TypographySpan>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                    filter === f.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="relative flex items-center sm:w-64">
              <Search className="absolute left-3 size-3.5 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search links, deliveries, people"
                aria-label="Search links"
                className="w-full rounded-full border border-border bg-muted pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </label>
          </div>

          {canManage && selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5">
              <TypographySpan className="text-xs font-semibold text-foreground mr-2">{selected.size} selected</TypographySpan>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => bulk("extend")} className="text-xs rounded-full">
                Extend 7 days
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => bulk("downloads_off")} className="text-xs rounded-full">
                Downloads off
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => bulk("revoke")} className="text-xs rounded-full text-amber-600 dark:text-amber-400">
                Turn off
              </Button>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              {links.length === 0 ? "No links yet. Open a delivery and use Share to create one." : "No links match."}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] text-muted-foreground">
                    {canManage && (
                      <th className="px-4 py-2.5 w-8">
                        <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown links" />
                      </th>
                    )}
                    <th className="px-3 py-2.5 font-semibold">Link</th>
                    <th className="px-3 py-2.5 font-semibold">Delivery</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                    <th className="px-3 py-2.5 font-semibold">Access</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Opens</th>
                    <th className="px-3 py-2.5 font-semibold text-right">Downloads</th>
                    <th className="px-3 py-2.5 font-semibold">Last opened</th>
                    <th className="px-3 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((link) => (
                    <tr key={link.id} className={`border-b border-border/60 last:border-0 ${link.status === "revoked" ? "opacity-60" : ""}`}>
                      {canManage && (
                        <td className="px-4 py-2.5">
                          <input
                            type="checkbox"
                            checked={selected.has(link.id)}
                            onChange={() => toggle(link.id)}
                            aria-label={`Select ${link.label}`}
                          />
                        </td>
                      )}
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">{link.label}</span>
                          {link.isPrimary && (
                            <Badge variant="orange" className="text-[9px] px-1.5 py-0 font-bold">
                              MAIN
                            </Badge>
                          )}
                        </div>
                        {(link.recipientName || link.recipientEmail) && (
                          <span className="text-[11px] text-muted-foreground">For {link.recipientName || link.recipientEmail}</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link href={`/${workspaceSlug}/deliveries/${link.deliveryId}`} className="text-foreground hover:text-primary hover:underline">
                          {link.deliveryTitle}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {link.status === "revoked" ? (
                          <span className="text-muted-foreground">Turned off</span>
                        ) : (
                          <span className={link.status === "expired" || expiresSoon(link.expiresAt) ? "text-amber-600 dark:text-amber-400" : "text-foreground"}>
                            {expiryLabel(link.expiresAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {link.hasPasscode && <Lock className="size-3.5" aria-label="Passcode" />}
                          <MessageCircle className={`size-3.5 ${link.canComment ? "" : "opacity-30"}`} aria-label={link.canComment ? "Comments on" : "Comments off"} />
                          <ThumbsUp className={`size-3.5 ${link.canApprove ? "" : "opacity-30"}`} aria-label={link.canApprove ? "Approvals on" : "Approvals off"} />
                          <Download className={`size-3.5 ${link.canDownload ? "text-foreground" : "opacity-30"}`} aria-label={link.canDownload ? "Downloads on" : "Downloads off"} />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{link.openCount}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{link.downloadCount}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                        {link.lastOpenedAt ? timeAgo(link.lastOpenedAt) : "Not yet"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          disabled={link.status === "revoked"}
                          onClick={() => copy(link)}
                          title="Copy link"
                        >
                          {copiedId === link.id ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
