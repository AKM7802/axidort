import { Badge } from "@/components/ui/badge";
import type { ClientStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ClientStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  unpaid: { label: "Unpaid", variant: "secondary" },
  trial: { label: "Trial", variant: "secondary" },
  active: { label: "Active", variant: "default" },
  past_due: { label: "Past due", variant: "destructive" },
  canceled: { label: "Canceled", variant: "outline" },
};

export function StatusBadge({ status }: { status: ClientStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
