import { Mail, MapPin, Tag, User } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Panel } from "@/components/dashboard/panel";
import { territoryLabel } from "@/lib/geo";
import type { ClientProfile } from "@/lib/types";

const TAG_CLASS = "eyebrow inline-flex items-center border px-1.5 py-0.5";

export function ProfileCard({
  client,
  cityNames,
}: {
  client: ClientProfile;
  cityNames: Record<string, string>;
}) {
  return (
    <Panel title="Account" action={<StatusBadge status={client.status} />} bodyClassName="p-0">
      <div className="grid grid-cols-1 divide-y divide-foreground/15 md:grid-cols-3 md:divide-x md:divide-y-0">
        <div className="flex flex-col gap-3 p-5 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{client.contact_name}</span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{client.email}</span>
          </div>
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            Territories
          </div>
          {client.territories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No territories configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.territories.map((t) => (
                <span key={t.id} className={`${TAG_CLASS} border-foreground/30`}>
                  {territoryLabel(t.kind, t.value, cityNames)}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Tag className="h-3.5 w-3.5" />
            Category subscriptions
          </div>
          {client.category_subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No categories configured.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.category_subscriptions.map((c) => (
                <span key={c.category} className={`${TAG_CLASS} border-transparent bg-secondary`}>
                  {c.category}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}
