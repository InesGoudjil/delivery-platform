import React from "react";
import { Download, FileText, Receipt } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Invoice } from "@/core/entities/invoice";

interface InvoicesHistoryCardProps {
  invoices: Invoice[];
}

export function InvoicesHistoryCard({ invoices }: InvoicesHistoryCardProps) {
  return (
    <Card className="border border-border bg-card shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-muted text-foreground">
            <Receipt className="size-5 text-primary" />
          </div>
          <div className="flex flex-col gap-0.5">
            <CardTitle className="text-lg font-bold font-heading text-foreground">
              Past Invoices &amp; Receipts
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Official tax receipts for accounting and financial tracking.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2 border border-dashed border-border rounded-xl bg-background/40">
            <FileText className="size-8 text-muted-foreground/50" />
            <p className="text-xs font-semibold text-foreground">No invoices generated yet</p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              When you upgrade or renew your plan, detailed billing receipts with downloadable PDFs will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => {
              const formattedDate = new Date(inv.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const amountFormatted = `$${(inv.amountCents / 100).toFixed(2)} ${inv.currency}`;

              return (
                <div
                  key={inv.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1 last:pb-1"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">
                        {inv.description}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {inv.invoiceNumber}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <span className="font-mono text-sm font-bold text-foreground">
                      {amountFormatted}
                    </span>

                    {inv.pdfUrl || inv.hostedInvoiceUrl ? (
                      <a
                        href={inv.pdfUrl || inv.hostedInvoiceUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download data-icon="inline-start" className="size-3.5" />
                        <span>Receipt</span>
                      </a>
                    ) : (
                      <Badge variant="outline" className="text-xs capitalize font-mono border-emerald-500/30 text-emerald-500 bg-emerald-500/10">
                        {inv.status}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
