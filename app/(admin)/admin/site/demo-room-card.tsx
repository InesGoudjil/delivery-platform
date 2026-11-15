"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateDemoRoomAction } from "@/app/actions/admin";
import type { ClientRoomState } from "@/core/security/client-room";
import { Pill } from "../../_components/badges";
import { AdminSection } from "../../_components/page-header";
import { ReasonDialog } from "../../_components/reason-dialog";
import { formatDate } from "../../_lib/format";

export interface DemoRoomDelivery {
  title: string;
  workspaceId: string;
  workspaceName: string;
  /** The delivery's page in the studio. Only members of its workspace can open it. */
  studioPath: string | null;
  /** The room as a guest finds it. Visitors can only use an "open" one. */
  state: ClientRoomState;
  workspaceSuspended: boolean;
  expiresAt: string | null;
  commentsOn: boolean;
}

export interface DemoRoomCardData {
  showOnLanding: boolean;
  /** When an admin last changed the setting. Null while it has never been saved. */
  updatedAt: string | null;
  /** A delivery was saved as the demo room, but it no longer exists. */
  deliveryMissing: boolean;
  delivery: DemoRoomDelivery | null;
}

type DialogKind = "choose" | "show" | "hide" | "remove";

interface Note {
  tone: "warning" | "info";
  text: string;
}

/** What the admin should know about the chosen delivery, worst first. */
export function demoRoomNotes(delivery: DemoRoomDelivery): Note[] {
  const closed = "so /demo shows the sample screen and the landing page has no demo button.";
  const notes: Note[] = [];
  if (delivery.workspaceSuspended) {
    notes.push({ tone: "warning", text: `Its workspace is suspended, ${closed}` });
  } else if (delivery.state === "locked") {
    notes.push({ tone: "warning", text: `It has a passcode, ${closed} Remove the passcode in the studio.` });
  } else if (delivery.state === "expired") {
    notes.push({
      tone: "warning",
      text: `Its review link expired on ${formatDate(delivery.expiresAt)}, ${closed} Remove the expiry date in the studio.`,
    });
  } else if (delivery.state === "unavailable") {
    notes.push({ tone: "warning", text: `It's archived or in The Silo, ${closed}` });
  } else if (delivery.expiresAt) {
    notes.push({ tone: "info", text: `Its review link expires on ${formatDate(delivery.expiresAt)}. The demo room closes then.` });
  }
  if (!delivery.commentsOn) {
    notes.push({ tone: "info", text: "Comments are off for this delivery, so visitors can't try timecoded notes." });
  }
  notes.push({ tone: "info", text: "Downloads are always off for visitors here, whatever the delivery's own setting." });
  return notes;
}

/** The demo room setting: which delivery /demo shows, and whether the landing page links to it. */
export function DemoRoomCard({ demo }: { demo: DemoRoomCardData }) {
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const { delivery } = demo;
  const isSet = delivery !== null || demo.deliveryMissing;
  const openDialog = (kind: DialogKind) => (next: boolean) => setDialog(next ? kind : null);

  return (
    <AdminSection
      title="Demo room"
      description="The delivery anyone can open at /demo. Visitors can play, comment and approve; nothing they do is saved."
      actions={<LandingStatus demo={demo} />}
    >
      {delivery ? <ChosenDelivery delivery={delivery} /> : <NoDemoRoom missing={demo.deliveryMissing} />}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        {delivery &&
          (demo.showOnLanding ? (
            <Button variant="outline" size="sm" onClick={() => setDialog("hide")}>
              Hide from the landing page
            </Button>
          ) : (
            <Button size="sm" onClick={() => setDialog("show")}>
              Show on the landing page
            </Button>
          ))}
        <Button variant={delivery ? "outline" : "default"} size="sm" onClick={() => setDialog("choose")}>
          {isSet ? "Change delivery…" : "Choose the demo delivery…"}
        </Button>
        {isSet && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDialog("remove")}>
            Remove the demo room
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {demo.updatedAt ? `Last changed ${formatDate(demo.updatedAt)}. ` : null}
        <Link href="/admin/audit?action=site.update_demo_room" className="underline underline-offset-2 hover:text-foreground">
          History in the audit log
        </Link>
      </p>

      <ChooseDeliveryDialog open={dialog === "choose"} onOpenChange={openDialog("choose")} />
      <ReasonDialog
        open={dialog === "show"}
        onOpenChange={openDialog("show")}
        title="Show the demo room on the landing page?"
        description="Visitors get a “See a demo delivery” button in the hero, a Demo link in the menu and one in the client experience section, while the room opens for them."
        confirmLabel="Show it"
        onConfirm={async (reason) => {
          const result = await updateDemoRoomAction({ showOnLanding: true, reason });
          if (!result.success) return result.error;
          toast.success("The landing page now links to the demo room.");
        }}
      />
      <ReasonDialog
        open={dialog === "hide"}
        onOpenChange={openDialog("hide")}
        title="Hide the demo room from the landing page?"
        description="/demo keeps working for anyone who has the link."
        confirmLabel="Hide it"
        onConfirm={async (reason) => {
          const result = await updateDemoRoomAction({ showOnLanding: false, reason });
          if (!result.success) return result.error;
          toast.success("The landing page no longer links to the demo room.");
        }}
      />
      <ReasonDialog
        open={dialog === "remove"}
        onOpenChange={openDialog("remove")}
        title="Remove the demo room?"
        description="/demo goes back to the sample screen and the landing page loses its demo button. The delivery itself doesn't change."
        confirmLabel="Remove"
        destructive
        onConfirm={async (reason) => {
          const result = await updateDemoRoomAction({ reviewLink: "", reason });
          if (!result.success) return result.error;
          toast.success("Demo room removed.");
        }}
      />
    </AdminSection>
  );
}

function LandingStatus({ demo }: { demo: DemoRoomCardData }) {
  if (!demo.delivery) return <Pill>Not set</Pill>;
  if (!demo.showOnLanding) return <Pill>Not on the landing page</Pill>;
  if (demo.delivery.state !== "open") {
    return <Pill tone="warning">Hidden: visitors can&apos;t open it</Pill>;
  }
  return <Pill tone="success">On the landing page</Pill>;
}

function ChosenDelivery({ delivery }: { delivery: DemoRoomDelivery }) {
  const notes = demoRoomNotes(delivery);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{delivery.title}</p>
          <p className="text-xs text-muted-foreground">
            In{" "}
            <Link href={`/admin/workspaces/${delivery.workspaceId}`} className="underline-offset-2 hover:underline">
              {delivery.workspaceName}
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/demo" target="_blank" rel="noreferrer">
              Open /demo <ExternalLink className="size-3.5" />
            </a>
          </Button>
          {delivery.studioPath && (
            <Button asChild variant="outline" size="sm">
              <a href={delivery.studioPath} target="_blank" rel="noreferrer">
                Edit in the studio <ExternalLink className="size-3.5" />
              </a>
            </Button>
          )}
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {notes.map((note) => (
          <li
            key={note.text}
            className={cn(note.tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}
          >
            {note.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoDemoRoom({ missing }: { missing: boolean }) {
  return (
    <div className="space-y-3 text-sm text-muted-foreground">
      <p>
        {missing ? "The delivery saved as the demo room no longer exists." : "No demo room yet."} Until there is one,
        /demo shows the sample screen and the landing page has no demo button.
      </p>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          In a workspace you&apos;re a member of, make a delivery with a few short clips and a cover. Leave out the
          passcode and the expiry date. Keep the clips short: Cloudflare Stream bills each minute watched.
        </li>
        <li>
          Add the comments visitors should find. Write the client&apos;s from a private window before you choose the
          delivery here: after that, guests&apos; comments aren&apos;t saved. Yours, as a member of the workspace, still are.
        </li>
        <li>Copy its review link from the share dialog and paste it here.</li>
      </ol>
    </div>
  );
}

function ChooseDeliveryDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [link, setLink] = useState("");
  return (
    <ReasonDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setLink("");
        onOpenChange(next);
      }}
      title="Choose the demo delivery"
      description="Paste the delivery's review link, from its share dialog in the studio."
      confirmLabel="Use this delivery"
      canConfirm={link.trim().length > 0}
      onConfirm={async (reason) => {
        const result = await updateDemoRoomAction({ reviewLink: link, reason });
        if (!result.success) return result.error;
        toast.success("The demo room now shows this delivery.");
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="demo-room-link" className="text-sm font-medium">
          Review link
        </label>
        <Input
          id="demo-room-link"
          value={link}
          onChange={(event) => setLink(event.target.value)}
          placeholder="https://…/deliver/…"
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </ReasonDialog>
  );
}
