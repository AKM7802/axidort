import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";

export function DashboardHeader({
  companyName,
  onLogout,
}: {
  companyName: string;
  onLogout: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b py-5">
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="text-xl font-semibold tracking-tight">{companyName}</h1>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </header>
  );
}
