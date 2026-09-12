"use client";

import React, { useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Loader2,
  Mail,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inviteWaitlistCohortAction } from "@/app/actions/waitlist";
import { WaitlistEntry } from "@/core/entities/waitlist";

interface WaitlistClientProps {
  metrics: {
    total: number;
    pending: number;
    invited: number;
    registered: number;
  };
  entries: WaitlistEntry[];
}

export function WaitlistClient({ metrics, entries: initialEntries }: WaitlistClientProps) {
  const [entries, setEntries] = useState(initialEntries);
  const [cohortSize, setCohortSize] = useState(10);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleInviteCohort = () => {
    startTransition(async () => {
      setFeedback(null);
      const res = await inviteWaitlistCohortAction(cohortSize);
      if (res.success && "invitedCount" in res) {
        setFeedback({
          type: "success",
          message: `Successfully invited ${res.invitedCount} users! Check Resend logs for delivery.`,
        });
      } else {
        setFeedback({
          type: "error",
          message: (res as any).error || "Failed to invite cohort.",
        });
      }
    });
  };

  const filteredEntries = entries.filter((e) =>
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (e.role && e.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading">Waitlist & Cohort Management</h1>
          <p className="text-sm text-muted-foreground">
            Monitor queued registrants, manage viral referral ranking, and dispatch invite waves.
          </p>
        </div>

        {/* Invite Cohort Controls */}
        <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border">
          <select
            value={cohortSize}
            onChange={(e) => setCohortSize(Number(e.target.value))}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs focus:outline-none"
          >
            <option value={5}>Next 5 Users</option>
            <option value={10}>Next 10 Users</option>
            <option value={25}>Next 25 Users</option>
            <option value={50}>Next 50 Users</option>
          </select>
          <Button
            onClick={handleInviteCohort}
            disabled={isPending || metrics.pending === 0}
            size="sm"
            className="bg-[#f5551d] hover:bg-[#e04a16] text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                <span>Inviting...</span>
              </>
            ) : (
              <>
                <Send className="size-4 mr-2" />
                <span>Invite Cohort</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm border ${
            feedback.type === "success"
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Total Registrants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              In Queue (Pending)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-[#f5551d]">{metrics.pending}</div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Invited Cohorts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-blue-500">{metrics.invited}</div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase text-muted-foreground">
              Converted Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-500">{metrics.registered}</div>
          </CardContent>
        </Card>
      </div>

      {/* Queue Table */}
      <Card className="border border-border">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base font-semibold">Priority Queue (Top Ranked)</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-1.5 text-xs focus:outline-none"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-4 py-3">Rank / Email</th>
                  <th className="px-4 py-3">Referral Code</th>
                  <th className="px-4 py-3">Referrals</th>
                  <th className="px-4 py-3">Priority Score</th>
                  <th className="px-4 py-3">Role / Size</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No waitlist entries found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry, idx) => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-muted-foreground">#{idx + 1}</span>
                          <span>{entry.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{entry.referralCode}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-mono">
                          {entry.referralCount}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className="bg-[#f5551d]/10 text-[#f5551d] border-[#f5551d]/20">
                          +{entry.priorityScore} pts
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {entry.role || "N/A"} {entry.companySize ? `(${entry.companySize})` : ""}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            entry.status === "invited"
                              ? "default"
                              : entry.status === "registered"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
