import { CalendarIcon, ZapIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

export function ExampleLeadCard({
  businessName,
  categories,
  issue,
  flaggedDate,
  daysToDeliver,
}: {
  businessName: string;
  categories: string[];
  issue: string;
  flaggedDate: string;
  daysToDeliver: number;
}) {
  return (
    <Card className="h-full overflow-hidden border-border/60 transition-shadow hover:shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="w-fit text-muted-foreground">
            Example
          </Badge>
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary">
            <ZapIcon className="size-3.5" />
            {daysToDeliver}d to your inbox
          </div>
        </div>
        <p className="mt-2 font-heading text-base font-medium">{businessName}</p>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">&ldquo;{issue}&rdquo;</p>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarIcon className="size-3.5" />
          Flagged {flaggedDate}
        </div>
      </CardFooter>
    </Card>
  );
}
