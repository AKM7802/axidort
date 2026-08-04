"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ClientsTable } from "@/components/admin/clients-table";
import { useAdminAuth } from "@/lib/admin-auth";
import { api, apiErrorMessage } from "@/lib/api";
import { buildCityNameMap } from "@/lib/geo";
import type { AdminClient, SubscribableCategory } from "@/lib/types";

const CATEGORY_OPTIONS: { value: SubscribableCategory; label: string }[] = [
  { value: "pest", label: "Pest" },
  { value: "sanitation", label: "Sanitation" },
  { value: "equipment", label: "Equipment" },
  { value: "plumbing", label: "Plumbing" },
  { value: "temperature", label: "Temperature" },
];

export default function AdminClientsPage() {
  const router = useRouter();
  const { loading, isAdmin, token } = useAdminAuth();

  const [clients, setClients] = useState<AdminClient[] | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<SubscribableCategory | "all">("all");
  const [cityNames, setCityNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.push("/admin/login");
    }
  }, [loading, isAdmin, router]);

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
    if (!isAdmin || !token) return;
    let cancelled = false;

    setDataLoading(true);
    setDataError(null);

    api
      .adminClients(token)
      .then((res) => {
        if (cancelled) return;
        setClients(res);
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

  const filteredClients =
    categoryFilter === "all"
      ? (clients ?? [])
      : (clients ?? []).filter((client) =>
          client.category_subscriptions.some((c) => c.category === categoryFilter)
        );

  if (loading || !isAdmin) {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Admin</Badge>
          <h1 className="text-xl font-semibold">Clients</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/admin" />}>
            &larr; Back to console
          </Button>
          <Button nativeButton={false} render={<Link href="/admin/clients/new" />}>Add client</Button>
        </div>
      </header>

      {dataError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load clients</AlertTitle>
          <AlertDescription>{dataError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {dataLoading ? "Loading…" : `${filteredClients.length} of ${clients?.length ?? 0} clients`}
            </p>
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as SubscribableCategory | "all")}>
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

          {dataLoading ? (
            <div className="flex flex-col gap-2 py-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <ClientsTable
              clients={filteredClients}
              cityNames={cityNames}
              emptyTitle={categoryFilter !== "all" ? "No clients match this category" : undefined}
              emptyDescription={
                categoryFilter !== "all" ? "Try a different category or clear the filter." : undefined
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
