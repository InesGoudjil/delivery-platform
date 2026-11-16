"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "../../_lib/format";

/**
 * A client's setup link, to copy and send another way (WhatsApp, say). It's shown once: the panel
 * never stores it, and it isn't in the audit log.
 */
export function SetupLinkPanel({ link, expiresAt }: { link: string; expiresAt: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Select it and copy it yourself.");
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor="client-setup-link" className="text-sm font-medium">
        Setup link
      </label>
      <div className="flex gap-2">
        <Input
          id="client-setup-link"
          readOnly
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="font-mono text-xs"
        />
        <Button type="button" variant="outline" onClick={copy} className="shrink-0">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Works once, until {formatDateTime(expiresAt)}. Whoever opens it can choose the password, so send it only to
        them. Don&apos;t open it yourself: it would sign you in as them.
      </p>
    </div>
  );
}
