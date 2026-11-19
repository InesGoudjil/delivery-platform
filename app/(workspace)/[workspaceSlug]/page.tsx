import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Film,
  ArrowRight,
  Clock,
  CheckCircle2,
  HardDrive,
  Lock,
  Layers,
  MessageSquare,
  AlertTriangle,
  Upload,
  PartyPopper,
  Sparkles,
  Users,
  CalendarClock,
} from "lucide-react";
import { getServerServices } from "@/core/server";
import type { Delivery, DeliverySummaryItem } from "@/core/entities/delivery";
import type { WorkspaceEntitlements } from "@/core/entities/workspace";
import {
  TypographyMuted,
  TypographyKicker,
  Typography,
} from "@/components/ui/typography";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CopyReviewLinkButton } from "./_components/dashboard-client-actions";
import { DashboardBodySkeleton } from "./_components/dashboard-skeleton";

const DAY_MS = 24 * 60 * 60 * 1000;
const GB_IN_BYTES = 1024 * 1024 * 1024;

export default async function WorkspaceDashboardPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const services = await getServerServices();

  const workspace = await services.workspace.getWorkspaceBySlug(workspaceSlug);
  if (!workspace) {
    redirect("/");
  }

  const { plan, entitlements } = await services.subscription
    .getPlanAndEntitlements(workspace.id)
    .catch(() => ({ plan: null, entitlements: null }));
  const planName = plan?.name || entitlements?.planName || "Starter";

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-300">
      {/* 1. Header */}
      <div className="glass-panel relative rounded-3xl p-6 sm:p-8 overflow-hidden">
        <div className="absolute -top-24 -right-24 size-96 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="size-11 sm:size-12 rounded-2xl glass-card flex items-center justify-center font-heading font-black text-lg text-primary shadow-inner ring-1 ring-primary/30 shrink-0">
              {workspace.brandName ? workspace.brandName.slice(0, 2).toUpperCase() : "CS"}
            </div>
            <div className="space-y-0.5">
              <TypographyKicker className="text-[11px] text-primary uppercase tracking-widest font-bold">
                {planName} plan
                {entitlements?.isTrial ? " · Trial" : ""}
              </TypographyKicker>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-foreground tracking-tight">
                Welcome back, {workspace.brandName}
              </h1>
            </div>
          </div>

          <Link
            href={`/${workspaceSlug}/deliveries`}
            className={cn(buttonVariants(), "glass-btn text-xs font-bold cursor-pointer self-start sm:self-center gap-2")}
          >
            <Plus className="size-4" />
            <span>New delivery</span>
          </Link>
        </div>
      </div>

      <Suspense fallback={<DashboardBodySkeleton />}>
        <DashboardBody
          workspace={workspace}
          workspaceSlug={workspaceSlug}
          entitlements={entitlements}
          planName={planName}
        />
      </Suspense>
    </div>
  );
}

/**
 * Everything that depends on the workspace's deliveries. One fetch of the rooms feeds the
 * KPIs, the "needs attention" list and the recent rooms, so they always agree.
 */
async function DashboardBody({
  workspace,
  workspaceSlug,
  entitlements,
  planName,
}: {
  workspace: { id: string; storageUsedBytes?: number; slug: string };
  workspaceSlug: string;
  entitlements: WorkspaceEntitlements | null;
  planName: string;
}) {
  const services = await getServerServices();
  const seatsMax = entitlements?.limits?.teamSeatsMax ?? 1;

  const [deliveries, summaries, seatStats] = await Promise.all([
    services.delivery.listWorkspaceDeliveries(workspace.id).catch(() => [] as Delivery[]),
    services.delivery.listWorkspaceDeliveriesSummary(workspace.id).catch(() => [] as DeliverySummaryItem[]),
    // Seats only matter on plans that have more than one.
    seatsMax > 1 ? services.member.getWorkspaceSeatStats(workspace.id).catch(() => null) : Promise.resolve(null),
  ]);

  const deliveryById = new Map(deliveries.map((d) => [d.id, d]));
  const rooms: Room[] = (summaries.length > 0 ? summaries : deliveries.map(toSummary))
    .filter((s) => s.status !== "archived")
    .map((s) => ({ ...s, delivery: deliveryById.get(s.id) }));

  // "draft" is only used by the system's recovered-uploads room; everywhere else it reads as in review.
  const inReview = rooms.filter((r) => r.status === "in_review" || r.status === "draft");
  const approved = rooms.filter((r) => r.status === "approved");
  const openNotes = inReview.reduce((sum, r) => sum + (r.commentsCount || 0), 0);
  const roomsWithNotes = inReview.filter((r) => (r.commentsCount || 0) > 0).length;

  const now = Date.now();
  const approvedThisWeek = approved.filter((r) => {
    const at = r.delivery?.approvedAt;
    return at ? now - new Date(at).getTime() <= 7 * DAY_MS : false;
  }).length;

  return (
    <div className="space-y-8">
      <StatsRow
        workspace={workspace}
        entitlements={entitlements}
        inReviewCount={inReview.length}
        approvedCount={approved.length}
        approvedThisWeek={approvedThisWeek}
        openNotes={openNotes}
        roomsWithNotes={roomsWithNotes}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <AttentionPanel rooms={rooms} workspaceSlug={workspaceSlug} now={now} />
        </div>
        <PlanPanel
          workspaceSlug={workspaceSlug}
          entitlements={entitlements}
          planName={planName}
          activeRooms={rooms.length}
          seatsUsed={seatStats?.usedSeats ?? null}
        />
      </div>

      <RecentDeliveries rooms={rooms} workspaceSlug={workspaceSlug} now={now} />
    </div>
  );
}

type Room = DeliverySummaryItem & { delivery?: Delivery };

function toSummary(d: Delivery): DeliverySummaryItem {
  return {
    ...d,
    clientName: "Private Client",
    assetsCount: 0,
    commentsCount: 0,
    passcodeProtected: Boolean(d.passcodeHash),
  };
}

/* -------------------------------------------------------------------------- */
/* KPIs                                                                       */
/* -------------------------------------------------------------------------- */

function StatsRow({
  workspace,
  entitlements,
  inReviewCount,
  approvedCount,
  approvedThisWeek,
  openNotes,
  roomsWithNotes,
}: {
  workspace: { storageUsedBytes?: number; slug: string };
  entitlements: WorkspaceEntitlements | null;
  inReviewCount: number;
  approvedCount: number;
  approvedThisWeek: number;
  openNotes: number;
  roomsWithNotes: number;
}) {
  const usedBytes = workspace.storageUsedBytes || 0;
  const storageQuotaGb =
    entitlements?.features?.storage_gb || entitlements?.limits?.storageGbMax || 50;
  const percentage = Math.min(100, Math.round((usedBytes / (storageQuotaGb * GB_IN_BYTES)) * 100));
  const quotaDisplay =
    storageQuotaGb >= 1024 ? `${(storageQuotaGb / 1024).toFixed(1)} TB` : `${storageQuotaGb} GB`;
  const storageTone =
    percentage >= 90 ? "text-destructive" : percentage >= 75 ? "text-amber-500" : "text-sky-400";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        href={`/${workspace.slug}/deliveries?status=in_review`}
        label="In Review"
        value={inReviewCount}
        valueClass="text-primary"
        icon={<Clock className="size-4" />}
        iconClass="bg-primary/15 text-primary border-primary/25"
        hint={inReviewCount === 1 ? "Room waiting on your client" : "Rooms waiting on your clients"}
      />
      <StatCard
        href={`/${workspace.slug}/deliveries?status=in_review`}
        label="Client Notes"
        value={openNotes}
        valueClass={openNotes > 0 ? "text-amber-500" : "text-foreground"}
        icon={<MessageSquare className="size-4" />}
        iconClass="bg-amber-500/15 text-amber-500 border-amber-500/25"
        hint={
          openNotes > 0
            ? `Across ${roomsWithNotes} ${roomsWithNotes === 1 ? "room" : "rooms"} still in review`
            : "No feedback waiting on you"
        }
      />
      <StatCard
        href={`/${workspace.slug}/deliveries?status=approved`}
        label="Approved"
        value={approvedCount}
        valueClass="text-emerald-500 dark:text-emerald-400"
        icon={<CheckCircle2 className="size-4" />}
        iconClass="bg-emerald-500/15 text-emerald-500 border-emerald-500/25"
        hint={approvedThisWeek > 0 ? `${approvedThisWeek} signed off this week` : "Signed off by clients"}
      />

      <Link
        href={`/${workspace.slug}/storage`}
        className="glass-stat-card rounded-2xl p-4 sm:p-5 group block cursor-pointer"
      >
        <div className="flex items-center justify-between mb-3">
          <TypographyKicker className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">
            Cloud Vault
          </TypographyKicker>
          <div className="size-9 rounded-xl bg-sky-500/15 text-sky-400 border border-sky-500/25 flex items-center justify-center shrink-0 shadow-sm">
            <HardDrive className="size-4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
            <div className="flex items-baseline gap-1">
              <Typography className={`text-2xl font-extrabold font-heading ${storageTone}`}>
                {formatSize(usedBytes)}
              </Typography>
              <span className="text-xs text-muted-foreground">/ {quotaDisplay}</span>
            </div>
            <span className="glass-badge-sky text-[10px]">{usedBytes > 0 && percentage < 1 ? "<1" : percentage}% used</span>
          </div>
          <div className="w-full bg-white/10 dark:bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                percentage >= 90 ? "bg-destructive" : "bg-gradient-to-r from-sky-500 to-primary"
              }`}
              style={{ width: `${Math.max(percentage, usedBytes > 0 ? 1 : 0)}%` }}
            />
          </div>
        </div>
      </Link>
    </div>
  );
}

function StatCard({
  href,
  label,
  value,
  valueClass,
  icon,
  iconClass,
  hint,
}: {
  href: string;
  label: string;
  value: number;
  valueClass: string;
  icon: React.ReactNode;
  iconClass: string;
  hint: string;
}) {
  return (
    <Link href={href} className="glass-stat-card rounded-2xl p-4 sm:p-5 group block cursor-pointer">
      <div className="flex items-center justify-between mb-3">
        <TypographyKicker className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-semibold truncate">
          {label}
        </TypographyKicker>
        <div className={`size-9 rounded-xl border flex items-center justify-center shrink-0 shadow-sm ${iconClass}`}>
          {icon}
        </div>
      </div>
      <Typography className={`text-3xl font-extrabold font-heading ${valueClass}`}>{value}</Typography>
      <TypographyMuted className="text-xs text-muted-foreground/80 mt-1">{hint}</TypographyMuted>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/* Needs attention                                                            */
/* -------------------------------------------------------------------------- */

type AttentionItem = {
  id: string;
  priority: number;
  icon: React.ReactNode;
  tone: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
};

function buildAttentionItems(rooms: Room[], workspaceSlug: string, now: number): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const room of rooms) {
    const href = `/${workspaceSlug}/deliveries/${room.id}`;
    const expiresAt = room.delivery?.expiresAt ? new Date(room.delivery.expiresAt).getTime() : null;
    const isOpen = room.status !== "approved";

    if (expiresAt !== null && isOpen && expiresAt - now <= 7 * DAY_MS) {
      const expired = expiresAt <= now;
      const days = Math.max(1, Math.ceil((expiresAt - now) / DAY_MS));
      items.push({
        id: `${room.id}-expiry`,
        priority: expired ? 0 : 1,
        icon: <CalendarClock className="size-4" />,
        tone: expired
          ? "bg-destructive/15 text-destructive border-destructive/25"
          : "bg-amber-500/15 text-amber-500 border-amber-500/25",
        title: room.title,
        detail: expired
          ? "Review link has expired — your client can't open it"
          : `Review link expires in ${days} ${days === 1 ? "day" : "days"}`,
        href,
        cta: "Extend",
      });
    }

    if (isOpen && (room.commentsCount || 0) > 0) {
      items.push({
        id: `${room.id}-notes`,
        priority: 2,
        icon: <MessageSquare className="size-4" />,
        tone: "bg-primary/15 text-primary border-primary/25",
        title: room.title,
        detail: `${room.commentsCount} client ${room.commentsCount === 1 ? "note" : "notes"} from ${room.clientName}`,
        href,
        cta: "Review notes",
      });
    }

    if ((room.assetsCount || 0) === 0) {
      items.push({
        id: `${room.id}-empty`,
        priority: 3,
        icon: <Upload className="size-4" />,
        tone: "bg-purple-500/15 text-purple-400 border-purple-500/25",
        title: room.title,
        detail: "No cuts uploaded yet — your client sees an empty room",
        href,
        cta: "Upload",
      });
    }

    const approvedAt = room.delivery?.approvedAt ? new Date(room.delivery.approvedAt).getTime() : null;
    if (room.status === "approved" && approvedAt !== null && now - approvedAt <= 7 * DAY_MS) {
      items.push({
        id: `${room.id}-approved`,
        priority: 4,
        icon: <PartyPopper className="size-4" />,
        tone: "bg-emerald-500/15 text-emerald-500 border-emerald-500/25",
        title: room.title,
        detail: `Approved${room.delivery?.approvedByName ? ` by ${room.delivery.approvedByName}` : ""} ${relativeTime(approvedAt, now)}`,
        href,
        cta: "Open",
      });
    }
  }

  return items.sort((a, b) => a.priority - b.priority);
}

function AttentionPanel({ rooms, workspaceSlug, now }: { rooms: Room[]; workspaceSlug: string; now: number }) {
  const items = buildAttentionItems(rooms, workspaceSlug, now);
  const visible = items.slice(0, 5);

  return (
    <div className="glass-card rounded-2xl p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" />
          <h2 className="text-base font-bold font-heading text-foreground border-none pb-0">
            Needs your attention
          </h2>
          {items.length > 0 && (
            <span className="glass-badge-orange text-[10px] font-bold">{items.length}</span>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-2">
          <div className="size-10 rounded-xl bg-emerald-500/15 text-emerald-500 border border-emerald-500/25 flex items-center justify-center">
            <CheckCircle2 className="size-5" />
          </div>
          <h3 className="text-sm font-bold text-foreground">You&apos;re all caught up</h3>
          <TypographyMuted className="text-xs text-muted-foreground max-w-xs">
            {rooms.length === 0
              ? "Create a delivery room and its client notes, expiring links and approvals will show up here."
              : "No client notes, expiring links or empty rooms right now."}
          </TypographyMuted>
        </div>
      ) : (
        <ul className="divide-y divide-white/5">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className={`size-8 rounded-lg border flex items-center justify-center shrink-0 ${item.tone}`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{item.detail}</p>
                </div>
                <span className="text-xs font-semibold text-primary shrink-0 inline-flex items-center gap-1">
                  {item.cta}
                  <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {items.length > visible.length && (
        <Link
          href={`/${workspaceSlug}/deliveries`}
          className="mt-4 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          +{items.length - visible.length} more in Client Deliveries
        </Link>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Plan usage                                                                 */
/* -------------------------------------------------------------------------- */

const LOCKED_FEATURE_LABELS: Array<[keyof WorkspaceEntitlements["can"], string]> = [
  ["passwordProtect", "Passcode-protected links"],
  ["watermark", "Watermarked previews"],
  ["customBranding", "Your branding on client rooms"],
  ["receiveDownloadNotifications", "Download notifications"],
  ["sendWhatsApp", "WhatsApp delivery"],
  ["whiteLabel", "White-label client rooms"],
];

function PlanPanel({
  workspaceSlug,
  entitlements,
  planName,
  activeRooms,
  seatsUsed,
}: {
  workspaceSlug: string;
  entitlements: WorkspaceEntitlements | null;
  planName: string;
  activeRooms: number;
  seatsUsed: number | null;
}) {
  const roomsMax = entitlements?.limits?.clientLinksMax ?? 1;
  const seatsMax = entitlements?.limits?.teamSeatsMax ?? 1;
  const locked = entitlements
    ? LOCKED_FEATURE_LABELS.filter(([key]) => !entitlements.can?.[key]).map(([, label]) => label)
    : [];
  const atRoomLimit = roomsMax !== -1 && activeRooms >= roomsMax;
  const showUpgrade = locked.length > 0 || atRoomLimit;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h2 className="text-base font-bold font-heading text-foreground border-none pb-0">
            {planName} plan
          </h2>
        </div>
        <Link
          href={`/${workspaceSlug}/subscription`}
          className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          Billing
        </Link>
      </div>

      <UsageRow
        icon={<Film className="size-3.5" />}
        label="Active delivery rooms"
        used={activeRooms}
        max={roomsMax}
      />
      {seatsMax > 1 && seatsUsed !== null && (
        <UsageRow icon={<Users className="size-3.5" />} label="Team seats" used={seatsUsed} max={seatsMax} />
      )}

      {locked.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <TypographyKicker className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
            Not on your plan
          </TypographyKicker>
          <ul className="space-y-1">
            {locked.slice(0, 3).map((label) => (
              <li key={label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Lock className="size-3 shrink-0" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showUpgrade && (
        <Link
          href={`/${workspaceSlug}/subscription`}
          className={cn(buttonVariants({ size: "sm" }), "glass-btn text-xs font-bold cursor-pointer mt-auto gap-1.5")}
        >
          {atRoomLimit ? "Upgrade for more rooms" : "Upgrade plan"}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

function UsageRow({
  icon,
  label,
  used,
  max,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  max: number;
}) {
  const unlimited = max === -1;
  const pct = unlimited || max <= 0 ? 0 : Math.min(100, Math.round((used / max) * 100));
  const full = !unlimited && used >= max;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className={`font-semibold ${full ? "text-amber-500" : "text-foreground"}`}>
          {used} / {unlimited ? "∞" : max}
        </span>
      </div>
      {!unlimited && (
        <div className="w-full bg-white/10 dark:bg-white/5 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div
            className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Recent deliveries                                                          */
/* -------------------------------------------------------------------------- */

function RecentDeliveries({ rooms, workspaceSlug, now }: { rooms: Room[]; workspaceSlug: string; now: number }) {
  const recent = [...rooms]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-heading text-foreground border-none pb-0">
          Recent deliveries
        </h2>
        {rooms.length > 0 && (
          <Link
            href={`/${workspaceSlug}/deliveries`}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/10 cursor-pointer rounded-full px-3 gap-1"
            )}
          >
            View all <ArrowRight className="size-3.5 ml-0.5" />
          </Link>
        )}
      </div>

      {recent.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 sm:p-14 text-center relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-md mx-auto space-y-4">
            <div className="size-14 rounded-2xl glass-card flex items-center justify-center mx-auto text-primary shadow-inner ring-1 ring-primary/20">
              <Film className="size-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold font-heading text-foreground">
                No delivery rooms yet
              </h3>
              <TypographyMuted className="text-xs text-muted-foreground leading-relaxed">
                Create a room, upload your cut and send the link — your client reviews and leaves
                timecoded notes without needing an account.
              </TypographyMuted>
            </div>
            <Link
              href={`/${workspaceSlug}/deliveries`}
              className={cn(buttonVariants(), "glass-btn text-xs font-bold cursor-pointer gap-2")}
            >
              <Plus className="size-4" />
              <span>Create your first delivery</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recent.map((room) => (
            <RecentDeliveryCard key={room.id} room={room} workspaceSlug={workspaceSlug} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecentDeliveryCard({ room, workspaceSlug, now }: { room: Room; workspaceSlug: string; now: number }) {
  const isApproved = room.status === "approved";
  const assetsCount = room.assetsCount || 0;
  const commentsCount = room.commentsCount || 0;
  const href = `/${workspaceSlug}/deliveries/${room.id}`;

  let durationStr = "";
  if (room.activeDurationSeconds && room.activeDurationSeconds > 0) {
    const totalSec = Math.round(room.activeDurationSeconds);
    durationStr = `${String(Math.floor(totalSec / 60)).padStart(2, "0")}:${String(totalSec % 60).padStart(2, "0")}`;
  }

  return (
    <div className="group glass-card glass-card-interactive rounded-2xl p-5 flex flex-col justify-between gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`${isApproved ? "glass-badge-emerald" : "glass-badge-orange"} text-[10px] font-bold px-2 py-0.5`}>
            {!isApproved && <span className="size-1.5 rounded-full bg-primary animate-pulse mr-1 inline-block" />}
            {isApproved ? "Approved" : "In Review"}
          </span>
          <span className="glass-pill text-[11px] font-medium px-2.5 py-0.5 rounded-full text-foreground/80">
            {room.clientName || "Private Client"}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/80">
          Updated {relativeTime(new Date(room.updatedAt).getTime(), now)}
        </span>
      </div>

      <Link href={href} className="block group/title focus:outline-none">
        <h3 className="font-heading font-bold text-base text-foreground group-hover/title:text-primary transition-colors line-clamp-1">
          {room.title}
        </h3>
        {room.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{room.description}</p>
        )}
      </Link>

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5 text-xs text-muted-foreground">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium">
            <Layers className="size-3 text-muted-foreground/70" />
            {assetsCount} {assetsCount === 1 ? "cut" : "cuts"}
          </span>
          {durationStr && <span className="text-[11px] font-mono">{durationStr}</span>}
          {commentsCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary font-medium">
              <MessageSquare className="size-3" />
              {commentsCount} {commentsCount === 1 ? "note" : "notes"}
            </span>
          )}
          {room.passcodeProtected && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium" title="Passcode protected">
              <Lock className="size-3" />
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {room.shareToken && <CopyReviewLinkButton shareToken={room.shareToken} projectTitle={room.title} />}
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-7 px-2.5 rounded-lg text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/10 transition-colors cursor-pointer flex items-center gap-1")}
          >
              <span>Open</span>
              <ArrowRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
            </Link>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers & skeletons                                                        */
/* -------------------------------------------------------------------------- */

function formatSize(bytes: number) {
  if (bytes >= GB_IN_BYTES * 1024) return `${(bytes / (GB_IN_BYTES * 1024)).toFixed(1)} TB`;
  if (bytes >= GB_IN_BYTES) return `${(bytes / GB_IN_BYTES).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function relativeTime(then: number, now: number) {
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en", { month: "short", day: "numeric" });
}
