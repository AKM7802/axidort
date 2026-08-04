"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LeadsTable } from "@/components/dashboard/leads-table";
import { api, apiErrorMessage } from "@/lib/api";
import type { DigestStatus, EmailDigest, EmailDigestDetail } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

function DigestStatusBadge({ status }: { status: DigestStatus }) {
  if (status === "sent") return <Badge variant="secondary">Sent</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function ReportsListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function ReportsSection({
  token,
  subscribedCategories,
}: {
  token: string;
  subscribedCategories: Set<string>;
}) {
  const [digests, setDigests] = useState<EmailDigest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<EmailDigestDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .myDigests(token)
      .then((res) => {
        if (!cancelled) setDigests(res.items);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    api
      .myDigestDetail(token, selectedId)
      .then((res) => {
        if (!cancelled) setDetail(res);
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, token]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reports</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <ReportsListSkeleton />
        ) : digests.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-16 text-center">
            <p className="text-sm font-medium">No reports sent yet</p>
            <p className="text-sm text-muted-foreground">
              Your first weekly digest will appear here once it&apos;s sent.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Period</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {digests.map((digest) => (
                  <TableRow
                    key={digest.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(digest.id)}
                  >
                    <TableCell className="whitespace-nowrap">
                      {formatDate(digest.period_start)} – {formatDate(digest.period_end)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDate(digest.sent_at)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{digest.lead_count}</TableCell>
                    <TableCell>
                      <DigestStatusBadge status={digest.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {detail ? `Report: ${formatDate(detail.period_start)} – ${formatDate(detail.period_end)}` : "Report"}
            </DialogTitle>
            <DialogDescription>
              {detail
                ? `Sent ${formatDate(detail.sent_at)} · ${detail.lead_count} lead${detail.lead_count === 1 ? "" : "s"} included`
                : "Loading report details…"}
            </DialogDescription>
          </DialogHeader>
          {detailLoading || !detail ? (
            <ReportsListSkeleton />
          ) : (
            <LeadsTable leads={detail.leads} loading={false} subscribedCategories={subscribedCategories} />
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
