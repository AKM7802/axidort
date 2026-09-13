"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Panel } from "@/components/dashboard/panel";
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <div className="flex items-end justify-between border-b-2 border-foreground pb-5">
        <Skeleton className="h-10 w-56 rounded-none" />
        <Skeleton className="h-8 w-20 rounded-none" />
      </div>
      <Skeleton className="h-28 w-full rounded-none" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 w-full rounded-none lg:col-span-2" />
        <Skeleton className="h-80 w-full rounded-none" />
      </div>
      <Skeleton className="h-40 w-full rounded-none" />
      <Skeleton className="h-64 w-full rounded-none" />
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
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
      <DashboardHeader companyName={client.company_name} onLogout={handleLogout} />

      <StatsCards stats={stats} loading={statsLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <LeadsOverTimeChart data={stats?.by_week ?? []} loading={statsLoading} />
        </div>
        <div>
          <CategoryBreakdownChart data={stats?.by_category ?? []} loading={statsLoading} />
        </div>
      </div>

      <ProfileCard client={client} cityNames={cityNames} />

      <Panel title="Your Leads" bodyClassName="flex flex-col gap-4">
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
      </Panel>

      {token && <ReportsSection token={token} subscribedCategories={subscribedCategories} />}
    </div>
  );
}
