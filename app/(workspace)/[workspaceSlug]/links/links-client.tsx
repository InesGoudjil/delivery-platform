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

const FILTERS: ReadonlyArray<{ id: Filter; label: string; short?: string }> = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "expiring", label: "Expiring this week", short: "Expiring" },
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
        <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
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
              <div key={stat.label} className="glass-card rounded-2xl px-4 py-3">
                <TypographySpan className="block text-2xl font-bold text-foreground tabular-nums">{stat.value}</TypographySpan>
                <TypographySpan className="block text-[11px] text-muted-foreground">{stat.label}</TypographySpan>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Wraps on narrow screens; the fixed radius keeps a wrapped bar a rounded box, not a capsule. */}
            <div className="glass-pill self-start flex flex-wrap items-center gap-1 rounded-[1.25rem] p-1 max-w-full">
              {FILTERS.map((f) => {
                const active = filter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    {f.short ? (
                      <>
                        <span className="sm:hidden">{f.short}</span>
                        <span className="hidden sm:inline">{f.label}</span>
                      </>
                    ) : (
                      f.label
                    )}
                  </button>
                );
              })}
            </div>
            <label className="glass-pill relative flex items-center rounded-full w-full lg:w-64 lg:shrink-0">
              <Search className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search links, deliveries, people"
                aria-label="Search links"
                className="w-full rounded-full bg-transparent pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </label>
          </div>

          {canManage && selected.size > 0 && (
            <div className="glass-card flex flex-wrap items-center gap-2 rounded-2xl px-4 py-2.5">
              <span className="glass-badge-orange mr-2">{selected.size} selected</span>
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
            <div className="glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground">
              {links.length === 0 ? "No links yet. Open a delivery and use Share to create one." : "No links match."}
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-x-auto">
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
                    <tr
                      key={link.id}
                      className={`border-b border-border/60 last:border-0 transition-colors hover:bg-foreground/[0.03] ${link.status === "revoked" ? "opacity-60" : ""}`}
                    >
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
