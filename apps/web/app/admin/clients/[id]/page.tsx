"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminLeadsTable, AdminLeadsTableSkeleton } from "@/components/admin/admin-leads-table";
import { ClientDigestsSection } from "@/components/admin/client-digests-table";
import { ClientEditForm } from "@/components/admin/client-edit-form";
import { ClientStatusBadge } from "@/components/admin/status-badge";
import { useAdminAuth } from "@/lib/admin-auth";
import { api, apiErrorMessage } from "@/lib/api";
import type { AdminClient, PaginatedLeads, ViolationCategory } from "@/lib/types";

const LEADS_PAGE_SIZE = 25;

const CATEGORY_OPTIONS: { value: ViolationCategory; label: string }[] = [
  { value: "pest", label: "Pest" },
  { value: "sanitation", label: "Sanitation" },
  { value: "equipment", label: "Equipment" },
  { value: "plumbing", label: "Plumbing" },
  { value: "temperature", label: "Temperature" },
  { value: "other", label: "Other" },
];

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

function formatAddress(client: AdminClient): string {
  const cityStateZip = [client.business_city, client.business_state].filter(Boolean).join(", ");
  const parts = [client.business_address, [cityStateZip, client.business_zip].filter(Boolean).join(" ")].filter(
    Boolean
  );
  return parts.join(", ");
}

export default function AdminClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { loading, isAdmin, token } = useAdminAuth();

  const [client, setClient] = useState<AdminClient | null>(null);
  const [clientLoading, setClientLoading] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);

  const [leads, setLeads] = useState<PaginatedLeads | null>(null);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsOffset, setLeadsOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<ViolationCategory | "all">("all");

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let cancelled = false;

    setClientLoading(true);
    setClientError(null);

    api
      .adminClientDetail(token, id)
      .then((res) => {
        if (cancelled) return;
        setClient(res);
      })
      .catch((err) => {
        if (cancelled) return;
        const message = apiErrorMessage(err);
        setClientError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!cancelled) setClientLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token, id]);

  useEffect(() => {
    if (!isAdmin || !token) return;
    let cancelled = false;

    setLeadsLoading(true);

    api
      .adminClientLeads(
        token,
        id,
        LEADS_PAGE_SIZE,
        leadsOffset,
        categoryFilter === "all" ? undefined : categoryFilter
      )
      .then((res) => {
        if (cancelled) return;
        setLeads(res);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLeadsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, token, id, leadsOffset, categoryFilter]);

  function handleCategoryFilterChange(value: string | null) {
    if (value === null) return;
    setCategoryFilter(value as ViolationCategory | "all");
    setLeadsOffset(0);
  }

  const subscribedCategories = new Set(client?.category_subscriptions.map((c) => c.category) ?? []);

  if (loading || !isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Admin</Badge>
          <h1 className="text-xl font-semibold">Client</h1>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/admin/clients" />}>
          &larr; Back to clients
        </Button>
      </header>

      {clientError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load client</AlertTitle>
          <AlertDescription>{clientError}</AlertDescription>
        </Alert>
      )}

      {clientLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : client ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">{client.company_name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {client.contact_name} &middot; {client.email}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <ClientStatusBadge status={client.status} />
                  {!client.is_active && <Badge variant="destructive">Inactive</Badge>}
                  {client.is_exclusive && <Badge>Exclusive</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-xs text-muted-foreground">Joined {formatDate(client.created_at)}</p>

              <Separator />

              <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Phone</dt>
                  <dd>{client.contact_phone || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Industry</dt>
                  <dd>{client.industry || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Business address</dt>
                  <dd>{formatAddress(client) || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {token && <ClientEditForm token={token} client={client} onUpdated={setClient} />}

          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-lg">Leads</CardTitle>
                <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {leadsLoading ? (
                <AdminLeadsTableSkeleton />
              ) : (
                <AdminLeadsTable
                  leads={leads?.items ?? []}
                  loading={false}
                  subscribedCategories={subscribedCategories}
                />
              )}

              {leads && leads.total > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {leads.offset + 1}–{Math.min(leads.offset + leads.items.length, leads.total)} of{" "}
                    {leads.total}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={leadsOffset === 0 || leadsLoading}
                      onClick={() => setLeadsOffset((prev) => Math.max(0, prev - LEADS_PAGE_SIZE))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={leadsOffset + LEADS_PAGE_SIZE >= leads.total || leadsLoading}
                      onClick={() => setLeadsOffset((prev) => prev + LEADS_PAGE_SIZE)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {token && (
            <ClientDigestsSection token={token} clientId={id} subscribedCategories={subscribedCategories} />
          )}
        </>
      ) : null}
    </div>
  );
}
