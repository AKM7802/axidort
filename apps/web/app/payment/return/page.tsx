"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { CheckCircle2Icon, Loader2Icon, XCircleIcon } from "lucide-react";

import { useClientAuth } from "@/lib/client-auth";
import { BRAND_INITIALS, BRAND_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Dodo's return_url redirect is not proof of payment — it can land here
// before the subscription.active webhook has even been delivered, let
// alone processed. The redirect's own `status` query param is only used
// to short-circuit the obvious "customer backed out of checkout" case;
// actual entitlement is decided server-side by billing_service.
// handle_webhook and reflected only in GET /me, so this page polls that
// instead of trusting anything in the URL.
const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 30; // ~60s

function PaymentReturnContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, refresh } = useClientAuth();
  const [pollCount, setPollCount] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkoutFailed = searchParams.get("status") === "failed";

  useEffect(() => {
    if (checkoutFailed || client?.status === "active") return;
    if (pollCount >= MAX_POLLS) return;

    timeoutRef.current = setTimeout(async () => {
      const profile = await refresh().catch(() => null);
      if (profile?.status !== "active") {
        setPollCount((n) => n + 1);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkoutFailed, client?.status, pollCount, refresh]);

  useEffect(() => {
    if (client?.status !== "active") return;
    const redirect = setTimeout(() => router.push("/dashboard"), 1200);
    return () => clearTimeout(redirect);
  }, [client?.status, router]);

  const timedOut = pollCount >= MAX_POLLS && client?.status !== "active";

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <Link
            href="/"
            className="mx-auto mb-2 flex items-center gap-2 font-heading text-sm font-semibold tracking-tight"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">
              {BRAND_INITIALS}
            </span>
            {BRAND_NAME}
          </Link>

          {checkoutFailed ? (
            <>
              <XCircleIcon className="mx-auto size-10 text-destructive" />
              <CardTitle className="text-xl">Checkout didn&apos;t complete</CardTitle>
              <CardDescription>No payment was taken. You can try again whenever you&apos;re ready.</CardDescription>
            </>
          ) : client?.status === "active" ? (
            <>
              <CheckCircle2Icon className="mx-auto size-10 text-emerald-500" />
              <CardTitle className="text-xl">You&apos;re all set</CardTitle>
              <CardDescription>Payment confirmed — taking you to your dashboard…</CardDescription>
            </>
          ) : timedOut ? (
            <>
              <CardTitle className="text-xl">Still confirming your payment</CardTitle>
              <CardDescription>
                This is taking longer than usual. If you completed checkout, it&apos;ll finish processing shortly —
                otherwise you can try again below.
              </CardDescription>
            </>
          ) : (
            <>
              <Loader2Icon className="mx-auto size-10 animate-spin text-primary" />
              <CardTitle className="text-xl">Confirming your payment…</CardTitle>
              <CardDescription>This only takes a few seconds. Don&apos;t close this page.</CardDescription>
            </>
          )}
        </CardHeader>
        {(checkoutFailed || timedOut) && (
          <CardContent>
            <Button className="w-full" nativeButton={false} render={<Link href="/payment" />}>
              Back to payment
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center px-6 py-16" />}>
      <PaymentReturnContent />
    </Suspense>
  );
}
