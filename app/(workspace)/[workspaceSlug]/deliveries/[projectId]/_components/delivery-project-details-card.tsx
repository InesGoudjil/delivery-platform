"use client";

import { useState } from "react";
import { Mail, Phone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateDeliveryDetailsAction } from "@/app/actions/deliveries";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { TypographyH3, TypographyMuted, TypographySpan } from "@/components/ui/typography";
import { toast } from "sonner";

interface DeliveryProjectDetailsCardProps {
  projectId: string;
  initialTitle: string;
  initialClientName: string;
  initialClientEmail?: string | null;
  initialClientPhone?: string | null;
  initialDescription: string;
  onSaved: (
    title: string,
    clientName: string,
    description: string,
    clientEmail: string,
    clientPhone: string
  ) => void;
  triggerToast: (msg: string) => void;
}

export function DeliveryProjectDetailsCard({
  projectId,
  initialTitle,
  initialClientName,
  initialClientEmail = "",
  initialClientPhone = "",
  initialDescription,
  onSaved,
  triggerToast,
}: DeliveryProjectDetailsCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [clientName, setClientName] = useState(initialClientName);
  const [clientEmail, setClientEmail] = useState(initialClientEmail || "");
  const [clientPhone, setClientPhone] = useState(initialClientPhone || "");
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateDeliveryDetailsAction(projectId, {
        title,
        clientName,
        clientEmail: clientEmail.trim(),
        clientPhone: clientPhone.trim(),
        description,
      });
      if (res.success) {
        onSaved(title, clientName, description, clientEmail.trim(), clientPhone.trim());
        triggerToast("Delivery details updated successfully");
      } else {
        toast.error(res.error || "Failed to update delivery details");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border shadow-xl hover:translate-y-0 hover:shadow-xl">
      <CardHeader className="border-b border-border/50 pb-4">
        <div>
          <CardTitle className="p-0 border-none">
            <TypographyH3 className="text-base font-bold font-heading text-card-foreground">
              Project details
            </TypographyH3>
          </CardTitle>
          <TypographyMuted className="text-xs text-muted-foreground mt-0.5">
            Configure key information for this client review room
          </TypographyMuted>
        </div>
        <CardAction>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="rounded-full bg-primary text-primary-foreground font-bold text-xs hover:bg-primary/90 cursor-pointer shadow-sm"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-5 pt-5">
        <Field orientation="vertical">
          <FieldLabel htmlFor="project-title" className="text-muted-foreground font-mono text-xs">
            Title
          </FieldLabel>
          <Input
            id="project-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-10 bg-muted/40 border border-input rounded-xl px-3.5 text-foreground font-medium text-sm focus-visible:border-primary transition-colors"
          />
        </Field>

        {/* Client Information Section */}
        <div className="space-y-3 pt-1">
          <TypographySpan className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest block">
            CLIENT CONTACT INFORMATION
          </TypographySpan>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field orientation="vertical">
              <FieldLabel htmlFor="project-client" className="text-muted-foreground font-mono text-xs flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground/70" />
                <TypographySpan>Client / Brand</TypographySpan>
              </FieldLabel>
              <Input
                id="project-client"
                type="text"
                placeholder="e.g. Lost in Tokyo Group"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="h-10 bg-muted/40 border border-input rounded-xl px-3.5 text-foreground font-medium text-sm focus-visible:border-primary transition-colors"
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="project-client-email" className="text-muted-foreground font-mono text-xs flex items-center justify-between">
                <TypographySpan className="flex items-center gap-1.5">
                  <Mail className="size-3 text-muted-foreground/70" />
                  <TypographySpan>Email</TypographySpan>
                </TypographySpan>
                <TypographySpan className="text-[10px] text-muted-foreground/60">Optional</TypographySpan>
              </FieldLabel>
              <Input
                id="project-client-email"
                type="email"
                placeholder="client@example.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="h-10 bg-muted/40 border border-input rounded-xl px-3.5 text-foreground font-medium text-sm focus-visible:border-primary transition-colors"
              />
            </Field>

            <Field orientation="vertical">
              <FieldLabel htmlFor="project-client-phone" className="text-muted-foreground font-mono text-xs flex items-center justify-between">
                <TypographySpan className="flex items-center gap-1.5">
                  <Phone className="size-3 text-muted-foreground/70" />
                  <TypographySpan>Phone / WhatsApp</TypographySpan>
                </TypographySpan>
                <TypographySpan className="text-[10px] text-muted-foreground/60">Optional</TypographySpan>
              </FieldLabel>
              <Input
                id="project-client-phone"
                type="tel"
                placeholder="+1 555 123 4567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="h-10 bg-muted/40 border border-input rounded-xl px-3.5 text-foreground font-medium text-sm focus-visible:border-primary transition-colors"
              />
            </Field>
          </div>
        </div>

        <Field orientation="vertical">
          <FieldLabel htmlFor="project-desc" className="text-muted-foreground font-mono text-xs">
            Description (shows on your public page)
          </FieldLabel>
          <textarea
            id="project-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-muted/40 border border-input rounded-xl px-3.5 py-2.5 text-foreground font-medium text-sm focus:outline-none focus:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 transition-colors resize-y"
          />
        </Field>
      </CardContent>
    </Card>
  );
}
