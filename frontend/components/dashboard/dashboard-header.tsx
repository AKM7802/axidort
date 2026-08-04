import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

export function DashboardHeader({
  companyName,
  onLogout,
}: {
  companyName: string;
  onLogout: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b py-5">
      <div className="flex items-center gap-3">
        <LogoMark className="hidden size-9 sm:flex" />
        <div>
          <p className="text-sm text-muted-foreground">Dashboard</p>
          <h1 className="text-xl font-semibold tracking-tight">{companyName}</h1>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onLogout}>
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </header>
  );
}
