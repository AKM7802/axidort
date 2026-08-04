import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  highlighted = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  /** Flagship tile in the bento layout — a touch more visual weight. */
  highlighted?: boolean;
}) {
  return (
    <Card
      className={cn(
        "h-full",
        highlighted && "border-primary/20 bg-gradient-to-br from-primary/[0.07] to-transparent",
        className
      )}
    >
      <CardHeader>
        <div
          className={cn(
            "mb-2 flex items-center justify-center rounded-lg bg-primary/10 text-primary",
            highlighted ? "size-11" : "size-10"
          )}
        >
          <Icon className="size-5" />
        </div>
        <CardTitle className={highlighted ? "text-lg" : "text-base"}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
