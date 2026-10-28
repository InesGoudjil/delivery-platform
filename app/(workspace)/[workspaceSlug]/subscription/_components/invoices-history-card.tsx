import React from "react";
import { Download, FileText, Receipt, CheckCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TypographyH3, TypographyMuted, TypographySmall, TypographySpan } from "@/components/ui/typography";
import { Invoice } from "@/core/entities/invoice";

interface InvoicesHistoryCardProps {
  invoices: Invoice[];
}

export function InvoicesHistoryCard({ invoices }: InvoicesHistoryCardProps) {
  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-muted text-foreground">
              <Receipt className="size-5 text-primary" />
            </div>
            <div className="flex flex-col gap-0.5">
              <CardTitle className="p-0 border-none">
                <TypographyH3 className="text-lg font-bold font-heading text-foreground">
                  Past Invoices &amp; Receipts
                </TypographyH3>
              </CardTitle>
              <TypographyMuted className="text-xs text-muted-foreground">
                Official tax receipts with VAT details for studio bookkeeping and accounting.
              </TypographyMuted>
            </div>
          </div>

          {invoices.length > 0 && (
            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
              {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center gap-2.5 border border-dashed border-border/80 rounded-xl bg-background/50">
            <div className="p-3 rounded-full bg-muted/60 text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <div className="flex flex-col gap-1 max-w-sm">
              <TypographySmall className="text-xs font-bold text-foreground">No invoices generated yet</TypographySmall>
              <TypographyMuted className="text-[11px] text-muted-foreground leading-relaxed">
                When you upgrade or renew your plan, detailed billing receipts with downloadable PDF invoices will be automatically generated and archived here.
              </TypographyMuted>
            </div>
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
                      <TypographySpan className="text-xs font-bold text-foreground">
                        {inv.description}
                      </TypographySpan>
                      <TypographySpan className="text-[11px] font-mono text-muted-foreground">
                        {inv.invoiceNumber}
                      </TypographySpan>
                    </div>
                    <TypographySpan className="text-[11px] text-muted-foreground">
                      {formattedDate}
                    </TypographySpan>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <TypographySpan className="font-mono text-sm font-bold text-foreground">
                      {amountFormatted}
                    </TypographySpan>

                    {inv.pdfUrl || inv.hostedInvoiceUrl ? (
                      <a
                        href={inv.pdfUrl || inv.hostedInvoiceUrl || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                      >
                        <Download data-icon="inline-start" className="size-3.5" />
                        <TypographySpan>PDF Receipt</TypographySpan>
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
