import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientStatusBadge } from "@/components/admin/status-badge";
import { territoryLabel } from "@/lib/geo";
import type { AdminClient } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

function TerritoriesCell({ client, cityNames }: { client: AdminClient; cityNames: Record<string, string> }) {
  const territories = client.territories ?? [];
  if (territories.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const visible = territories.slice(0, 3);
  const remaining = territories.length - visible.length;
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {visible.map((t) => (
        <Badge key={t.id} variant="secondary" className="font-normal">
          {territoryLabel(t.kind, t.value, cityNames)}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="outline" className="font-normal text-muted-foreground">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

function CategoriesCell({ client }: { client: AdminClient }) {
  const categories = client.category_subscriptions ?? [];
  if (categories.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex max-w-56 flex-wrap gap-1">
      {categories.map((c) => (
        <Badge key={c.category} variant="outline" className="font-normal capitalize">
          {c.category}
        </Badge>
      ))}
    </div>
  );
}

export function ClientsTable({
  clients,
  cityNames,
  emptyTitle = "No clients yet",
  emptyDescription = "Clients will show up here once they sign up.",
}: {
  clients: AdminClient[];
  cityNames: Record<string, string>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm font-medium">{emptyTitle}</p>
        <p className="text-sm text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Company</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Territories</TableHead>
          <TableHead>Categories</TableHead>
          <TableHead>Exclusive</TableHead>
          <TableHead>Joined</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell>
              <Link href={`/admin/clients/${client.id}`} className="flex flex-col hover:underline">
                <span className="font-medium whitespace-normal">{client.company_name}</span>
                <span className="text-xs text-muted-foreground whitespace-normal">
                  {client.contact_name} &middot; {client.email}
                </span>
              </Link>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-1.5">
                <ClientStatusBadge status={client.status} />
                {!client.is_active && (
                  <Badge variant="destructive" className="font-normal">
                    Inactive
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell>
              <TerritoriesCell client={client} cityNames={cityNames} />
            </TableCell>
            <TableCell>
              <CategoriesCell client={client} />
            </TableCell>
            <TableCell>
              {client.is_exclusive ? (
                <Badge className="font-normal">Exclusive</Badge>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-muted-foreground">{formatDate(client.created_at)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
