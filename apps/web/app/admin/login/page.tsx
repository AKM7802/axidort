"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAuth } from "@/lib/admin-auth";
import { BRAND_NAME } from "@/lib/brand";

export default function AdminLoginPage() {
  const router = useRouter();
  const { loading, isAdmin, signIn } = useAdminAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If an admin session already exists (e.g. revisiting this page), skip
  // straight to the console instead of showing the form.
  useEffect(() => {
    if (!loading && isAdmin) {
      router.push("/admin");
    }
  }, [loading, isAdmin, router]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) {
      toast.error(error);
      setSubmitting(false);
      return;
    }

    router.push("/admin");
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-100">
              Admin
            </Badge>
            <h1 className="text-xl font-semibold text-zinc-50">{BRAND_NAME} Admin Console</h1>
            <p className="text-sm text-zinc-400">Internal operator access only.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Use your account credentials. Admin access requires the admin role on your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-email">Email</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-password">Password</Label>
                  <Input
                    id="admin-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <Button type="submit" className="mt-2 w-full" disabled={submitting}>
                  {submitting ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-zinc-500">
            Admin access is granted by setting the admin role on a client account — it cannot be
            requested from this page.
          </p>
        </div>
      </div>
    </div>
  );
}
