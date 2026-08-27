import { getServerServices } from "@/core/server";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, CreditCard, HardDrive, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const services = await getServerServices();

  const workspace = await services.workspace.getWorkspaceById(id).catch(() => null);

  if (!workspace) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center space-y-3">
        <p className="text-muted-foreground text-lg font-mono">Workspace not found.</p>
        <Link href="/admin/workspaces" className="text-primary text-xs font-bold hover:underline inline-block">
          &larr; Back to all workspaces
        </Link>
      </div>
    );
  }

  const projects = await services.project.listWorkspaceProjects(workspace.id).catch(() => []);
  const subscription = await services.subscription.getSubscription(workspace.id).catch(() => null);
  const plan = subscription ? await services.subscription.getPlanById(subscription.planId).catch(() => null) : null;
  const features = await services.workspace.getWorkspaceFeatures(workspace.id).catch(() => ({} as any));

  const usedGB = (workspace.storageUsedBytes || 0) / (1024 * 1024 * 1024);
  const limitGB = (features as any)?.storage_gb || 500;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-border">
        <Link href="/admin/workspaces" className="p-2 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-black text-foreground">{workspace.brandName}</h1>
            <Badge variant="outline" className="text-[10px] font-mono capitalize border-border">
              {plan?.name || "Starter"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            /{workspace.slug} · ID: {workspace.id}
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-mono">Storage Used</CardDescription>
            <CardTitle className="text-xl font-bold font-heading">
              {usedGB.toFixed(1)} / {limitGB} GB
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-mono font-semibold">Default Language</CardDescription>
            <CardTitle className="text-xl font-bold font-heading uppercase">
              {workspace.defaultLanguage}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-mono font-semibold">Total Delivery Rooms</CardDescription>
            <CardTitle className="text-xl font-bold font-heading">
              {projects.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Subscription Information */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="size-4 text-[#f5551d]" /> Subscription Status &amp; Tier
          </CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Status</span>
                <span className={`font-bold capitalize ${
                  subscription.status === "active" ? "text-emerald-400" :
                  subscription.status === "trialing" ? "text-amber-400" : "text-muted-foreground"
                }`}>
                  {subscription.status}
                </span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Plan Name</span>
                <span className="font-bold text-foreground">{plan?.name || "Starter"}</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Price</span>
                <span className="font-bold text-primary">${((plan?.priceCents || 0) / 100).toFixed(0)}/mo</span>
              </div>

              <div>
                <span className="text-muted-foreground block text-[10px] uppercase">Currency</span>
                <span className="font-bold text-foreground">{subscription.currency}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">No subscription record provisioned yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <FileText className="size-4 text-primary" /> Delivery Projects ({projects.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono">No projects created in this workspace yet.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {projects.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-xs font-bold text-foreground">{p.title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">
                      Token: {p.shareToken} · Created {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-mono capitalize ${
                      p.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" :
                      p.status === "in_review" ? "bg-[#f5551d]/10 text-[#f5551d] border-[#f5551d]/30" :
                      "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
