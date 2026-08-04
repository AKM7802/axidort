import { Mail, MapPin, Tag, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { territoryLabel } from "@/lib/geo";
import type { ClientProfile } from "@/lib/types";

export function ProfileCard({
  client,
  cityNames,
}: {
  client: ClientProfile;
  cityNames: Record<string, string>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg">Account</CardTitle>
          <StatusBadge status={client.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{client.contact_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{client.email}</span>
          </div>
        </div>

        <Separator />

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Territories
          </div>
          {client.territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No territories configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.territories.map((t) => (
                <Badge key={t.id} variant="outline">
                  {territoryLabel(t.kind, t.value, cityNames)}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Category subscriptions
          </div>
          {client.category_subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.category_subscriptions.map((c) => (
                <Badge key={c.category} variant="secondary">
                  {c.category}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
