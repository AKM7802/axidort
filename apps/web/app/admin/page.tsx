"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReviewQueueTable } from "@/components/admin/review-queue-table";
import { StatsCards, StatsCardsSkeleton } from "@/components/admin/stats-cards";
import { LeadsOverTimeChart, LeadsOverTimeChartSkeleton } from "@/components/admin/leads-over-time-chart";
import { ClientsGrowthChart, ClientsGrowthChartSkeleton } from "@/components/admin/clients-growth-chart";
import {
  CategoryBreakdownChart,
  CategoryBreakdownChartSkeleton,
} from "@/components/admin/category-breakdown-chart";
import { useAdminAuth } from "@/lib/admin-auth";
import { api, apiErrorMessage } from "@/lib/api";
import type { AdminReviewQueueItem, AdminStats } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const { loading, isAdmin, token, signOut } = useAdminAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<AdminReviewQueueItem[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // Auth guard: once we know for sure this isn't an admin session, bounce to
  // the admin login page. Nothing renders below until isAdmin is confirmed.
  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let cancelled = false;

    setDataLoading(true);
    setDataError(null);

    Promise.all([api.adminStats(token), api.adminReviewQueue(token)])
      .then(([statsRes, reviewRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setReviewQueue(reviewRes);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = apiErrorMessage(err);
        setDataError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token]);

  async function handleLogout() {
    setSigningOut(true);
    await signOut();
    router.push("/admin/login");
  }

  if (loading || !isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <StatsCardsSkeleton />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <LeadsOverTimeChartSkeleton />
          <ClientsGrowthChartSkeleton />
          <CategoryBreakdownChartSkeleton />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Admin</Badge>
            <h1 className="text-2xl font-semibold tracking-tight">Console</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Operational overview across all clients, leads, and inspection activity.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} disabled={signingOut}>
          {signingOut ? "Logging out…" : "Log out"}
        </Button>
      </header>

      {dataError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load admin data</AlertTitle>
          <AlertDescription>{dataError}</AlertDescription>
        </Alert>
      )}

      {dataLoading ? <StatsCardsSkeleton /> : stats ? <StatsCards stats={stats} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {dataLoading || !stats ? (
          <>
            <LeadsOverTimeChartSkeleton />
            <ClientsGrowthChartSkeleton />
            <CategoryBreakdownChartSkeleton />
          </>
        ) : (
          <>
            <LeadsOverTimeChart data={stats.leads_by_week} />
            <ClientsGrowthChart data={stats.clients_by_week} />
            <CategoryBreakdownChart data={stats.leads_by_category} />
          </>
        )}
      </div>

      <Tabs defaultValue="clients">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="review-queue">Review Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="mt-4">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-muted-foreground">
                Manage client accounts, territories, categories, and their leads.
              </p>
              <Button nativeButton={false} render={<Link href="/admin/clients" />}>View all clients &rarr;</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review-queue" className="mt-4">
          <Card>
            <CardContent>
              {dataLoading ? (
                <div className="flex flex-col gap-2 py-4">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <ReviewQueueTable items={reviewQueue ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator />

      <p className="text-center text-xs text-muted-foreground">
        Admin access is granted by setting the admin role on a client account
        — there is no self-service admin signup.
      </p>
    </div>
  );
}
