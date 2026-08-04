"use client";

import { useState, type FormEvent, type ReactElement } from "react";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Opens a small email + business type form and mails the submission
 * straight to us (see POST /contact) — the only "get in touch" path now
 * that there's no self-serve signup or checkout. Reused by the pricing
 * cards, the login page, and the footer. `source` identifies which of
 * those triggered it, so the mailed-in lead shows where it came from. */
export function ContactDialog({ trigger, source }: { trigger: ReactElement; source?: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.contact({ email, business_type: businessType, source });
      toast.success("Thanks — we'll be in touch shortly.");
      setOpen(false);
      setEmail("");
      setBusinessType("");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Get in touch</DialogTitle>
            <DialogDescription>
              Share your email and business type — we&apos;ll reach out to set you up.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_email">Email</Label>
              <Input
                id="contact_email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_business_type">Business type</Label>
              <Input
                id="contact_business_type"
                required
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                placeholder="e.g. Pest control"
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Sending…" : "Send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
