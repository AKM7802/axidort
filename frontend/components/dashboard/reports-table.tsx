"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
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
import { EmptyState, Panel } from "@/components/dashboard/panel";
import { api, apiErrorMessage } from "@/lib/api";
import type { DigestStatus, EmailDigest, EmailDigestDetail } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" });

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

const STATUS_CLASS = "eyebrow rounded-none";

function DigestStatusBadge({ status }: { status: DigestStatus }) {
  if (status === "sent") return <Badge variant="secondary" className={STATUS_CLASS}>Sent</Badge>;
  if (status === "failed") return <Badge variant="destructive" className={STATUS_CLASS}>Failed</Badge>;
  return <Badge variant="outline" className={STATUS_CLASS}>Pending</Badge>;
}

function ReportsListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full rounded-none" />
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
    <Panel title="Reports">
        {loading ? (
          <ReportsListSkeleton />
        ) : digests.length === 0 ? (
          <EmptyState
            className="py-16"
            title="No reports sent yet"
            description="Your first weekly digest will appear here once it's sent."
          />
        ) : (
          <div className="overflow-hidden border border-foreground/15">
            <Table>
              <TableHeader className="bg-secondary/70 [&_th]:eyebrow [&_th]:h-9 [&_th]:px-3 [&_th]:text-muted-foreground">
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
                    <TableCell className="px-3 py-3 font-mono text-xs whitespace-nowrap">
                      {formatDate(digest.period_start)} – {formatDate(digest.period_end)}
                    </TableCell>
                    <TableCell className="px-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                      {formatDate(digest.sent_at)}
                    </TableCell>
                    <TableCell className="px-3 text-right font-mono tabular-nums">{digest.lead_count}</TableCell>
                    <TableCell className="px-3">
                      <DigestStatusBadge status={digest.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="headline text-2xl">
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
    </Panel>
  );
}
