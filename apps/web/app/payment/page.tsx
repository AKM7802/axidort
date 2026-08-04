"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";

import { api, apiErrorMessage } from "@/lib/api";
import { useClientAuth } from "@/lib/client-auth";
import { BRAND_INITIALS, BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const FEATURES = [
  "Up to 3 territories (zip, borough, or radius)",
  "All lead categories",
  "Weekly email digest",
  "CSV export",
  "Standard support",
];

const STATUS_COPY: Record<string, { title: string; description: string }> = {
  past_due: {
    title: "Your last payment didn't go through",
    description: "Renew below to pick up right where you left off — your territories and preferences are saved.",
  },
  canceled: {
    title: "Your subscription has ended",
    description: "Resubscribe below to start matching leads again — your territories and preferences are saved.",
  },
};

export default function PaymentPage() {
  const router = useRouter();
  const { token, client, loading, logout } = useClientAuth();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!client || !token) {
      router.push("/login");
      return;
    }
    if (client.status === "active") {
      router.push("/dashboard");
    }
  }, [loading, client, token, router]);

  async function handleSubscribe() {
    if (!token) return;
    setSubmitting(true);
    try {
      const { checkout_url } = await api.createCheckoutSession(token);
      window.location.href = checkout_url;
    } catch (err) {
      toast.error(apiErrorMessage(err));
      setSubmitting(false);
    }
  }

  if (loading || !client || client.status === "active") {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <Skeleton className="h-96 w-full max-w-md" />
      </div>
    );
  }

  const copy = STATUS_COPY[client.status] ?? {
    title: "One step left — activate your subscription",
    description: "Your account and lead preferences are saved. Subscribe to start receiving matched leads.",
  };

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="mb-2 flex items-center gap-2 font-heading text-sm font-semibold tracking-tight">
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
              {BRAND_INITIALS}
            </span>
            {BRAND_NAME}
          </Link>
          <CardTitle className="text-xl">{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-heading text-4xl font-semibold tracking-tight">$199</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="text-muted-foreground">{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t-0 bg-transparent pt-0">
          <Button className="w-full" size="lg" onClick={handleSubscribe} disabled={submitting}>
            {submitting ? "Redirecting to checkout…" : "Subscribe — $199/mo"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            You&apos;ll be redirected to Dodo Payments to complete checkout securely. Billed monthly, cancel
            anytime.
          </p>
          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="text-center text-xs text-muted-foreground hover:underline"
          >
            Log out
          </button>
        </CardFooter>
      </Card>
    </div>
  );
}
