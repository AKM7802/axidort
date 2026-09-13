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
    <header className="flex items-end justify-between gap-4 border-b-2 border-foreground pb-5">
      <div className="flex items-center gap-4">
        <LogoMark className="hidden size-10 sm:flex" />
        <div>
          <p className="eyebrow text-muted-foreground">Dashboard</p>
          <h1 className="headline mt-1.5 text-3xl sm:text-4xl">{companyName}</h1>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="h-8 rounded-sm border-foreground/80 bg-transparent px-3 hover:bg-foreground hover:text-background"
        onClick={onLogout}
      >
        <LogOut className="h-4 w-4" />
        Log out
      </Button>
    </header>
  );
}
