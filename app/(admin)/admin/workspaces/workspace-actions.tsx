"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, CreditCard, HardDrive, MoreHorizontal, PanelRight, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  suspendWorkspaceAction,
  unsuspendWorkspaceAction,
  updateWorkspaceFeaturesAction,
  updateWorkspacePlanAction,
} from "@/app/actions/admin";
import { ReasonDialog } from "../../_components/reason-dialog";
import { formatPlanPrice } from "../../_lib/format";

export interface AdminPlanOption {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  currency: string;
  billingInterval: string;
  isActive: boolean;
}

export interface WorkspaceActionTarget {
  id: string;
  brandName: string;
  slug: string;
  planId: string | null;
  stripeBilled: boolean;
  storageLimitGb: number | null;
  /** The storage_gb override, when there is one. */
  storageOverrideGb: number | null;
  suspendedAt: string | null;
}

/** Row and page actions for a workspace: open it, change its plan, override its storage. */
export function WorkspaceActionsMenu({
  workspace,
  plans,
  showOpen = true,
}: {
  workspace: WorkspaceActionTarget;
  plans: AdminPlanOption[];
  showOpen?: boolean;
}) {
  const [dialog, setDialog] = useState<"plan" | "storage" | "suspend" | "unsuspend" | null>(null);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${workspace.brandName}`}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          {showOpen && (
            <DropdownMenuItem render={<Link href={`/admin/workspaces/${workspace.id}`} />}>
              <PanelRight /> Open workspace page
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setDialog("plan")}>
            <CreditCard /> Change plan…
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setDialog("storage")}>
            <HardDrive /> Storage override…
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {workspace.suspendedAt ? (
            <DropdownMenuItem onClick={() => setDialog("unsuspend")}>
              <Unlock /> Lift suspension…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => setDialog("suspend")} variant="destructive">
              <Ban /> Suspend…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <ChangePlanDialog
        workspace={workspace}
        plans={plans}
        open={dialog === "plan"}
        onOpenChange={(open) => setDialog(open ? "plan" : null)}
      />
      <StorageOverrideDialog
        workspace={workspace}
        open={dialog === "storage"}
        onOpenChange={(open) => setDialog(open ? "storage" : null)}
      />
      <SuspendDialog
        workspace={workspace}
        open={dialog === "suspend"}
        onOpenChange={(open) => setDialog(open ? "suspend" : null)}
      />
      <ReasonDialog
        open={dialog === "unsuspend"}
        onOpenChange={(open) => setDialog(open ? "unsuspend" : null)}
        title={`Lift the suspension of ${workspace.brandName}?`}
        description="Its client links and portfolio open again, and its members can make changes."
        confirmLabel="Lift suspension"
        onConfirm={async (reason) => {
          const result = await unsuspendWorkspaceAction({ workspaceId: workspace.id, reason });
          if (!result.success) return result.error;
          toast.success(`${workspace.brandName} is no longer suspended.`);
        }}
      />
    </>
  );
}

function ChangePlanDialog({
  workspace,
  plans,
  open,
  onOpenChange,
}: {
  workspace: WorkspaceActionTarget;
  plans: AdminPlanOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [planId, setPlanId] = useState(workspace.planId ?? "");
  const [status, setStatus] = useState<"active" | "trialing">("active");
  const statusItems = [
    { value: "active", label: "Active" },
    { value: "trialing", label: "Trialing" },
  ];

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Change plan for ${workspace.brandName}`}
      description={
        workspace.stripeBilled
          ? "This workspace is billed through Stripe. Change its subscription in Stripe: a change here would be overwritten by the next Stripe event."
          : "For workspaces that don't pay through Stripe, such as beta testers and comped accounts."
      }
      confirmLabel="Change plan"
      canConfirm={!workspace.stripeBilled && planId !== "" && planId !== workspace.planId}
      onConfirm={async (reason) => {
        const result = await updateWorkspacePlanAction({ workspaceId: workspace.id, planId, status, reason });
        if (!result.success) return result.error;
        toast.success(`${workspace.brandName} is now on ${plans.find((plan) => plan.id === planId)?.name ?? "the new plan"}.`);
      }}
    >
      <fieldset className="space-y-2" disabled={workspace.stripeBilled}>
        <legend className="mb-1 text-sm font-medium">Plan</legend>
        {plans.map((plan) => (
          <label
            key={plan.id}
            className={cn(
              "flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm",
              planId === plan.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
              !plan.isActive && "opacity-60"
            )}
          >
            <span className="flex items-center gap-2">
              <input
                type="radio"
                name="plan"
                value={plan.id}
                checked={planId === plan.id}
                onChange={() => setPlanId(plan.id)}
                className="accent-primary"
              />
              <span>
                <span className="font-medium">{plan.name}</span>
                {plan.id === workspace.planId && <span className="text-xs text-muted-foreground"> · current</span>}
                {!plan.isActive && <span className="text-xs text-muted-foreground"> · archived</span>}
              </span>
            </span>
            <span className="text-xs text-muted-foreground">
              {formatPlanPrice(plan.priceCents, plan.currency, plan.billingInterval)}
            </span>
          </label>
        ))}
      </fieldset>
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Subscription status</span>
        <Select items={statusItems} value={status} onValueChange={(value) => setStatus(value === "trialing" ? "trialing" : "active")}>
          <SelectTrigger aria-label="Subscription status" disabled={workspace.stripeBilled}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ReasonDialog>
  );
}

function StorageOverrideDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: WorkspaceActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [mode, setMode] = useState<"set" | "remove">("set");
  const [value, setValue] = useState(String(workspace.storageOverrideGb ?? workspace.storageLimitGb ?? 100));
  const storageGb = Number(value);
  const validValue = Number.isInteger(storageGb) && storageGb >= 1 && storageGb <= 100_000;

  return (
    <ReasonDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Storage for ${workspace.brandName}`}
      description={
        workspace.storageOverrideGb !== null
          ? `Overridden to ${workspace.storageOverrideGb} GB. Remove the override to go back to the plan's limit.`
          : `The plan's limit applies${workspace.storageLimitGb !== null ? ` (${workspace.storageLimitGb} GB)` : ""}. An override replaces it until removed.`
      }
      confirmLabel={mode === "remove" ? "Remove override" : "Save override"}
      destructive={mode === "remove"}
      canConfirm={mode === "remove" ? workspace.storageOverrideGb !== null : validValue}
      onConfirm={async (reason) => {
        const result =
          mode === "remove"
            ? await updateWorkspaceFeaturesAction({ workspaceId: workspace.id, remove: ["storage_gb"], reason })
            : await updateWorkspaceFeaturesAction({ workspaceId: workspace.id, set: { storage_gb: storageGb }, reason });
        if (!result.success) return result.error;
        toast.success(mode === "remove" ? "Storage override removed." : `Storage set to ${storageGb} GB.`);
      }}
    >
      <div className="flex gap-2 text-sm">
        <Button type="button" size="sm" variant={mode === "set" ? "default" : "outline"} onClick={() => setMode("set")}>
          Set a limit
        </Button>
        {workspace.storageOverrideGb !== null && (
          <Button type="button" size="sm" variant={mode === "remove" ? "default" : "outline"} onClick={() => setMode("remove")}>
            Remove override
          </Button>
        )}
      </div>
      {mode === "set" && (
        <div className="space-y-1.5">
          <label htmlFor="storage-override" className="text-sm font-medium">
            Storage limit (GB)
          </label>
          <Input
            id="storage-override"
            type="number"
            inputMode="numeric"
            min={1}
            max={100000}
            step={1}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={!validValue || undefined}
          />
          {!validValue && <p className="text-xs text-destructive">Enter a whole number between 1 and 100,000.</p>}
        </div>
      )}
    </ReasonDialog>
  );
}

function SuspendDialog({
  workspace,
  open,
  onOpenChange,
}: {
  workspace: WorkspaceActionTarget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [typed, setTyped] = useState("");
  return (
    <ReasonDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTyped("");
        onOpenChange(next);
      }}
      title={`Suspend ${workspace.brandName}?`}
      description="Its client links and portfolio stop opening for visitors, and its members can still sign in to look at their work but can't change anything until you lift the suspension. The reason stays internal."
      confirmLabel="Suspend workspace"
      destructive
      canConfirm={typed.trim() === workspace.slug}
      onConfirm={async (reason) => {
        const result = await suspendWorkspaceAction({ workspaceId: workspace.id, confirmSlug: typed.trim(), reason });
        if (!result.success) return result.error;
        setTyped("");
        toast.success(`${workspace.brandName} is suspended.`);
      }}
    >
      <div className="space-y-1.5">
        <label htmlFor="suspend-confirm" className="text-sm font-medium">
          Type <span className="font-mono">{workspace.slug}</span> to confirm
        </label>
        <Input
          id="suspend-confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </ReasonDialog>
  );
}
