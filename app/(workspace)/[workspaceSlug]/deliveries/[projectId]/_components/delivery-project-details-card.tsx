"use client";

import { useState } from "react";
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

interface DeliveryProjectDetailsCardProps {
  projectId: string;
  initialTitle: string;
  initialClientName: string;
  initialDescription: string;
  onSaved: (title: string, clientName: string, description: string) => void;
  triggerToast: (msg: string) => void;
}

export function DeliveryProjectDetailsCard({
  projectId,
  initialTitle,
  initialClientName,
  initialDescription,
  onSaved,
  triggerToast,
}: DeliveryProjectDetailsCardProps) {
  const [title, setTitle] = useState(initialTitle);
  const [clientName, setClientName] = useState(initialClientName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await updateDeliveryDetailsAction(projectId, {
        title,
        clientName,
        description,
      });
      if (res.success) {
        onSaved(title, clientName, description);
        triggerToast("Delivery details updated successfully");
      } else {
        triggerToast(res.error || "Failed to update delivery details");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="rounded-2xl border border-border shadow-xl hover:translate-y-0 hover:shadow-xl">
      <CardHeader className="border-b border-border/50 pb-4">
        <div>
          <CardTitle className="text-base font-bold font-heading text-card-foreground">
            Project details
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground mt-0.5">
            Configure key information for this client review room
          </CardDescription>
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

        <Field orientation="vertical">
          <FieldLabel htmlFor="project-client" className="text-muted-foreground font-mono text-xs">
            Client
          </FieldLabel>
          <Input
            id="project-client"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="h-10 bg-muted/40 border border-input rounded-xl px-3.5 text-foreground font-medium text-sm focus-visible:border-primary transition-colors"
          />
        </Field>

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
