import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ClientStatus } from "@/lib/types";

const STATUS_LABEL: Record<ClientStatus, string> = {
  unpaid: "Unpaid",
  trial: "Trial",
  active: "Active",
  past_due: "Past due",
  canceled: "Canceled",
};

const STATUS_CLASS: Record<ClientStatus, string> = {
  unpaid: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  trial: "bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  active: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  past_due: "bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  canceled: "bg-zinc-500/10 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-400",
};

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return (
    <Badge variant="outline" className={cn("border-transparent", STATUS_CLASS[status])}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}
