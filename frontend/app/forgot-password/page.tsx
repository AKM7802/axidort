"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
      // Always show success, whether or not the email is registered — the
      // backend responds identically either way so this page can't be used
      // to check which addresses have an account.
      setSent(true);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      description="Enter the email on your account and we'll send you a link to reset your password."
    >
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            If an account exists for <span className="font-medium text-foreground">{email}</span>, a
            password reset link is on its way. Check your inbox — the link expires in 1 hour.
          </p>
          <Button variant="outline" className="h-10 w-full rounded-sm border-foreground/80" nativeButton={false} render={<Link href="/login" />}>
            Back to log in
          </Button>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <Button type="submit" className="mt-2 h-10 w-full rounded-sm hover:bg-foreground hover:text-background" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>

          <p className="mt-2 text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Log in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
