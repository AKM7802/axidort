"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { LeadsPagination } from "@/components/dashboard/leads-pagination";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { LeadsOverTimeChart } from "@/components/dashboard/leads-over-time-chart";
import { CategoryBreakdownChart } from "@/components/dashboard/category-breakdown-chart";
import { ReportsSection } from "@/components/dashboard/reports-table";
import { api, apiErrorMessage } from "@/lib/api";
import { useClientAuth } from "@/lib/client-auth";
import { buildCityNameMap } from "@/lib/geo";
import type { MeStats, PaginatedLeads } from "@/lib/types";

const LEADS_LIMIT = 25;

function DashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between border-b py-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-20" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 w-full lg:col-span-2" />
        <Skeleton className="h-64 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function DashboardPage() {
  const { token, client, loading, logout } = useClientAuth();
  const router = useRouter();

  const [leads, setLeads] = useState<PaginatedLeads | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [offset, setOffset] = useState(0);

  const [stats, setStats] = useState<MeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [cityNames, setCityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (loading) return;
    if (!client) {
      router.push("/login");
    }
  }, [loading, client, router]);

  useEffect(() => {
    let cancelled = false;
    api
      .geoStates()
      .then((states) => {
        if (!cancelled) setCityNames(buildCityNameMap(states));
      })
      .catch(() => {
        // Non-critical — territory chips just fall back to a generic label.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLeadsLoading(true);
    api
      .myLeads(token, LEADS_LIMIT, offset)
      .then((res) => {
        if (!cancelled) setLeads(res);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, offset]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setStatsLoading(true);
    api
      .myStats(token)
      .then((res) => {
        if (!cancelled) setStats(res);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setStatsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!client) {
    return null;
  }

  const subscribedCategories = new Set(client.category_subscriptions.map((s) => s.category));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6">
      <DashboardHeader companyName={client.company_name} onLogout={handleLogout} />

      <StatsCards stats={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadsOverTimeChart data={stats?.by_week ?? []} loading={statsLoading} />
        </div>
        <div>
          <CategoryBreakdownChart data={stats?.by_category ?? []} loading={statsLoading} />
        </div>
      </div>

      <ProfileCard client={client} cityNames={cityNames} />

      <Card>
        <CardHeader>
          <CardTitle>Your Leads</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LeadsTable
            leads={leads?.items ?? []}
            loading={leadsLoading}
            subscribedCategories={subscribedCategories}
          />
          {leads && (
            <LeadsPagination
              total={leads.total}
              limit={LEADS_LIMIT}
              offset={offset}
              disabled={leadsLoading}
              onPrevious={() => setOffset((o) => Math.max(0, o - LEADS_LIMIT))}
              onNext={() => setOffset((o) => o + LEADS_LIMIT)}
            />
          )}
        </CardContent>
      </Card>

      {token && <ReportsSection token={token} subscribedCategories={subscribedCategories} />}
    </div>
  );
}
